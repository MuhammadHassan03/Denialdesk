"""Runs the worker against a real, migrated Postgres. Set TEST_DATABASE_URL to run."""

import os
import secrets
from collections.abc import Iterator
from pathlib import Path
from uuid import UUID

import psycopg
import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from psycopg.rows import dict_row

from denialdesk_pipeline.jobs.job_queue import MAX_JOB_ATTEMPTS
from denialdesk_pipeline.jobs.settings import WorkerSettings
from denialdesk_pipeline.jobs.worker import run_one_job
from tests.fixtures import SYNTHETIC_835_DIR

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")

pytestmark = pytest.mark.skipif(TEST_DATABASE_URL == "", reason="TEST_DATABASE_URL is not set")

NONCE_LENGTH = 12


@pytest.fixture
def connection() -> Iterator[psycopg.Connection]:
    with psycopg.connect(TEST_DATABASE_URL) as test_connection:
        # Other tests' leftover jobs would be claimed first.
        test_connection.execute("UPDATE jobs SET status = 'done' WHERE status <> 'done'")
        test_connection.commit()
        yield test_connection


@pytest.fixture
def settings(tmp_path: Path) -> WorkerSettings:
    return WorkerSettings(
        database_url=TEST_DATABASE_URL, storage_dir=tmp_path, encryption_key=secrets.token_bytes(32)
    )


def _create_organization(connection: psycopg.Connection) -> tuple[UUID, UUID]:
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO organizations (name) VALUES ('Synthetic Org') RETURNING id")
        organization_row = cursor.fetchone()
        assert organization_row is not None
        organization_id = organization_row[0]
        cursor.execute(
            "INSERT INTO practices (organization_id, name) VALUES (%s, 'Synthetic Clinic')"
            " RETURNING id",
            (organization_id,),
        )
        practice_row = cursor.fetchone()
        assert practice_row is not None
        cursor.execute(
            "INSERT INTO users (organization_id, practice_id, email, name, timezone)"
            " VALUES (%s, %s, %s, 'Synthetic Biller', 'America/Chicago') RETURNING id",
            (organization_id, practice_row[0], f"biller-{secrets.token_hex(4)}@example.com"),
        )
        user_row = cursor.fetchone()
        assert user_row is not None
    connection.commit()
    return organization_id, user_row[0]


def _queue_file(
    connection: psycopg.Connection,
    settings: WorkerSettings,
    fixture_name: str,
    organization_id: UUID,
    user_id: UUID,
) -> UUID:
    stored_name = secrets.token_hex(16)
    nonce = secrets.token_bytes(NONCE_LENGTH)
    plain_bytes = (SYNTHETIC_835_DIR / fixture_name).read_bytes()
    encrypted_bytes = nonce + AESGCM(settings.encryption_key).encrypt(nonce, plain_bytes, None)
    (settings.storage_dir / stored_name).write_bytes(encrypted_bytes)

    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO remittances (organization_id, uploaded_by_user_id, source, sha256,"
            " original_filename, storage_uri) VALUES (%s, %s, '835', %s, %s, %s) RETURNING id",
            (organization_id, user_id, secrets.token_hex(32), fixture_name, f"local:{stored_name}"),
        )
        remittance_row = cursor.fetchone()
        assert remittance_row is not None
        cursor.execute(
            "INSERT INTO jobs (kind, remittance_id) VALUES ('process_remittance', %s)",
            (remittance_row[0],),
        )
    connection.commit()
    return UUID(str(remittance_row[0]))


def _remittance(connection: psycopg.Connection, remittance_id: UUID) -> dict[str, object]:
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT * FROM remittances WHERE id = %s", (remittance_id,))
        remittance_row = cursor.fetchone()
    connection.commit()
    assert remittance_row is not None
    return remittance_row


def _queue_codes(connection: psycopg.Connection, organization_id: UUID) -> list[str]:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT group_code || '-' || carc_code FROM denials WHERE organization_id = %s"
            " ORDER BY priority_bucket, rank_key",
            (organization_id,),
        )
        code_rows = cursor.fetchall()
    connection.commit()
    return [str(code_row[0]) for code_row in code_rows]


def test_835_becomes_ranked_denials_with_audit_events(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    organization_id, user_id = _create_organization(connection)
    remittance_id = _queue_file(connection, settings, "basic_denials.835", organization_id, user_id)

    assert run_one_job(connection, settings)

    remittance = _remittance(connection, remittance_id)
    assert remittance["status"] == "done"
    assert remittance["denial_count"] == 6
    # All deadlines are estimated 90 days out, so the queue is ordered by amount.
    assert _queue_codes(connection, organization_id) == [
        "CO-197",
        "CO-50",
        "CO-29",
        "CO-4",
        "CO-16",
        "CO-999",
    ]
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT count(*) FROM audit_events WHERE remittance_id = %s"
            " AND action = 'denial_created'",
            (remittance_id,),
        )
        audit_row = cursor.fetchone()
    assert audit_row is not None
    assert audit_row[0] == 6


def test_same_denials_in_a_new_file_are_counted_not_duplicated(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    organization_id, user_id = _create_organization(connection)
    _queue_file(connection, settings, "basic_denials.835", organization_id, user_id)
    run_one_job(connection, settings)
    first_order = _queue_codes(connection, organization_id)

    second_id = _queue_file(connection, settings, "basic_denials.835", organization_id, user_id)
    run_one_job(connection, settings)

    second = _remittance(connection, second_id)
    assert second["denial_count"] == 0
    assert isinstance(second["result_summary"], dict)
    assert second["result_summary"]["already_in_queue"] == 6
    assert _queue_codes(connection, organization_id) == first_order


def test_claim_file_fails_with_the_biller_message(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    organization_id, user_id = _create_organization(connection)
    remittance_id = _queue_file(connection, settings, "claim_file.837", organization_id, user_id)

    run_one_job(connection, settings)

    remittance = _remittance(connection, remittance_id)
    assert remittance["status"] == "failed"
    assert "837 claim file" in str(remittance["biller_message"])


def test_truncated_file_is_done_with_warnings(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    organization_id, user_id = _create_organization(connection)
    remittance_id = _queue_file(connection, settings, "truncated.835", organization_id, user_id)

    run_one_job(connection, settings)

    remittance = _remittance(connection, remittance_id)
    assert remittance["status"] == "done_with_warnings"
    assert remittance["denial_count"] == 6


def test_crashing_job_retries_then_fails_with_an_error_id(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    organization_id, user_id = _create_organization(connection)
    remittance_id = _queue_file(connection, settings, "basic_denials.835", organization_id, user_id)
    wrong_key_settings = settings.model_copy(update={"encryption_key": secrets.token_bytes(32)})

    for _ in range(MAX_JOB_ATTEMPTS):
        connection.execute(
            "UPDATE jobs SET run_after = now() WHERE remittance_id = %s", (remittance_id,)
        )
        connection.commit()
        run_one_job(connection, wrong_key_settings)

    remittance = _remittance(connection, remittance_id)
    assert remittance["status"] == "failed"
    assert remittance["error_id"] is not None
    assert _queue_codes(connection, organization_id) == []


def test_audit_events_cannot_be_changed(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    organization_id, user_id = _create_organization(connection)
    _queue_file(connection, settings, "basic_denials.835", organization_id, user_id)
    run_one_job(connection, settings)

    with pytest.raises(psycopg.errors.RaiseException):
        connection.execute(
            "UPDATE audit_events SET action = 'login' WHERE organization_id = %s",
            (organization_id,),
        )
    connection.rollback()
    with pytest.raises(psycopg.errors.RaiseException):
        connection.execute(
            "DELETE FROM audit_events WHERE organization_id = %s", (organization_id,)
        )
    connection.rollback()
