"""Upload to checked draft for each supported code, against a real Postgres.

The model replies are recorded files in tests/jobs/recorded. No test calls a real LLM.
"""

import json
from pathlib import Path

import psycopg
import pytest
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from denialdesk_pipeline.draft.llm_client import LlmReply, LlmRequest, LlmSettings
from denialdesk_pipeline.jobs.settings import WorkerSettings
from denialdesk_pipeline.jobs.worker import run_one_job
from tests.jobs.test_process_remittance import (
    TEST_DATABASE_URL,
    _create_organization,
    _queue_file,
    connection,
    settings,
)

__all__ = ["connection", "settings"]

pytestmark = pytest.mark.skipif(TEST_DATABASE_URL == "", reason="TEST_DATABASE_URL is not set")

RECORDED_DIR = Path(__file__).with_name("recorded")
LLM_SETTINGS = LlmSettings(
    api_key="not-a-real-key",
    model_name="recorded-model",
    input_cents_per_million_tokens=300,
    output_cents_per_million_tokens=1500,
)
POLICY_TEXT = (
    "Services performed within the approved authorization period are eligible for payment."
)


class RecordedWriter:
    def __init__(self, outputs: list[dict[str, object] | None]) -> None:
        self._outputs = list(outputs)

    def write(self, request: LlmRequest) -> LlmReply | None:
        output = self._outputs.pop(0)
        if output is None:
            return None
        return LlmReply(
            output=output, model_name="recorded-model", input_tokens=2000, output_tokens=500
        )


def _recorded(name: str) -> dict[str, object]:
    recorded: dict[str, object] = json.loads((RECORDED_DIR / f"{name}.json").read_text())
    return recorded


def _uploaded_denial(
    connection: psycopg.Connection, settings: WorkerSettings, code: str
) -> dict[str, object]:
    organization_id, user_id = _create_organization(connection)
    _queue_file(connection, settings, "basic_denials.835", organization_id, user_id)
    assert run_one_job(connection, settings)
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            "SELECT * FROM denials WHERE organization_id = %s"
            " AND group_code || '-' || carc_code = %s",
            (organization_id, code),
        )
        denial_row = cursor.fetchone()
    connection.commit()
    assert denial_row is not None
    return denial_row


def _request_draft(
    connection: psycopg.Connection, denial_id: object, recorded: dict[str, object]
) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE denials SET status = 'drafting', biller_facts = %s, draft_action = %s"
            " WHERE id = %s",
            (Jsonb(recorded["biller_facts"]), recorded["action"], denial_id),
        )
        cursor.execute(
            "INSERT INTO jobs (kind, denial_id) VALUES ('draft_denial', %s)", (denial_id,)
        )
    connection.commit()


def _add_policy(connection: psycopg.Connection, denial_row: dict[str, object]) -> None:
    connection.execute(
        "INSERT INTO payer_policies (organization_id, payer_id, policy_id, denial_code, topic,"
        " policy_text, source_url, effective_date)"
        " VALUES (%s, %s, 'SHP-PA-01', 'CO-197', 'Prior authorization', %s,"
        " 'https://example.com/policies/SHP-PA-01', '2026-01-01')",
        (denial_row["organization_id"], denial_row["payer_id"], POLICY_TEXT),
    )
    connection.commit()


def _rows(connection: psycopg.Connection, sql: str, denial_id: object) -> list[dict[str, object]]:
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(sql, (denial_id,))
        rows = cursor.fetchall()
    connection.commit()
    return rows


DRAFTS_SQL = """
SELECT d.version, d.action, d.model_name, d.prompt_version, d.input_tokens, d.output_tokens,
    d.cost_cents, r.overall, r.checks
FROM drafts d JOIN rules_checks r ON r.draft_id = d.id
WHERE d.denial_id = %s ORDER BY d.version
"""
DENIAL_SQL = "SELECT status, draft_failure_message, biller_facts FROM denials WHERE id = %s"
EVENTS_SQL = (
    "SELECT action FROM audit_events WHERE denial_id = %s AND draft_version IS NOT NULL"
    " ORDER BY created_at, action"
)


@pytest.mark.parametrize("recorded_name", ["co_197", "co_50", "co_4", "co_16", "co_29"])
def test_each_supported_code_gets_a_checked_draft(
    connection: psycopg.Connection, settings: WorkerSettings, recorded_name: str
) -> None:
    recorded = _recorded(recorded_name)
    denial_row = _uploaded_denial(connection, settings, str(recorded["code"]))
    _add_policy(connection, denial_row)
    _request_draft(connection, denial_row["id"], recorded)
    settings.llm = LLM_SETTINGS
    output = recorded["output"]
    assert isinstance(output, dict)

    assert run_one_job(connection, settings, RecordedWriter([output]))

    draft_rows = _rows(connection, DRAFTS_SQL, denial_row["id"])
    assert len(draft_rows) == 1
    draft_row = draft_rows[0]
    failed_checks = [check for check in draft_row["checks"] if check["outcome"] == "fail"]  # type: ignore[attr-defined]
    assert failed_checks == []
    assert draft_row["overall"] != "fail"
    assert draft_row["action"] == recorded["action"]
    assert draft_row["model_name"] == "recorded-model"
    assert draft_row["prompt_version"] == f"{recorded['action']}_v1"
    assert (draft_row["input_tokens"], draft_row["output_tokens"]) == (2000, 500)
    assert draft_row["cost_cents"] == 2
    assert _rows(connection, DENIAL_SQL, denial_row["id"])[0]["status"] == "in_review"
    event_actions = [row["action"] for row in _rows(connection, EVENTS_SQL, denial_row["id"])]
    assert event_actions == ["draft_created", "rules_checked"]


def test_invented_quote_fails_twice_and_both_versions_are_kept(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    recorded = _recorded("co_197_invented_quote")
    denial_row = _uploaded_denial(connection, settings, "CO-197")
    _add_policy(connection, denial_row)
    _request_draft(connection, denial_row["id"], recorded)
    settings.llm = LLM_SETTINGS
    output = recorded["output"]
    assert isinstance(output, dict)

    assert run_one_job(connection, settings, RecordedWriter([output, output]))

    draft_rows = _rows(connection, DRAFTS_SQL, denial_row["id"])
    assert [row["version"] for row in draft_rows] == [1, 2]
    assert [row["overall"] for row in draft_rows] == ["fail", "fail"]
    assert _rows(connection, DENIAL_SQL, denial_row["id"])[0]["status"] == "in_review"


def test_no_model_reply_puts_the_denial_back_with_its_facts(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    recorded = _recorded("co_197")
    denial_row = _uploaded_denial(connection, settings, "CO-197")
    _request_draft(connection, denial_row["id"], recorded)
    settings.llm = LLM_SETTINGS

    assert run_one_job(connection, settings, RecordedWriter([None, None]))

    denial_after = _rows(connection, DENIAL_SQL, denial_row["id"])[0]
    assert denial_after["status"] == "new"
    assert denial_after["draft_failure_message"] == (
        "We couldn't write the draft right now. Try again in a minute."
    )
    assert denial_after["biller_facts"] == recorded["biller_facts"]
    assert _rows(connection, DRAFTS_SQL, denial_row["id"]) == []


def test_missing_llm_settings_fail_the_draft_without_crashing(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    denial_row = _uploaded_denial(connection, settings, "CO-197")
    _request_draft(connection, denial_row["id"], _recorded("co_197"))

    assert run_one_job(connection, settings)

    assert _rows(connection, DENIAL_SQL, denial_row["id"])[0]["status"] == "new"


def test_second_open_draft_job_for_one_denial_is_refused(
    connection: psycopg.Connection, settings: WorkerSettings
) -> None:
    denial_row = _uploaded_denial(connection, settings, "CO-197")
    _request_draft(connection, denial_row["id"], _recorded("co_197"))

    with pytest.raises(psycopg.errors.UniqueViolation):
        connection.execute(
            "INSERT INTO jobs (kind, denial_id) VALUES ('draft_denial', %s)", (denial_row["id"],)
        )
    connection.rollback()
