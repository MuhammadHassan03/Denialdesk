"""The process_remittance job: stored file to ranked Denial rows, in one transaction."""

import logging
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from denialdesk_pipeline.intake.stored_file import read_stored_file
from denialdesk_pipeline.intake.x12_835 import parse_835
from denialdesk_pipeline.intake.x12_835_models import Transaction835
from denialdesk_pipeline.jobs.denial_rows import insert_denial
from denialdesk_pipeline.jobs.job_queue import ClaimedJob, mark_job_done
from denialdesk_pipeline.jobs.payers import find_or_create_payer
from denialdesk_pipeline.jobs.remittance_models import RemittanceToProcess
from denialdesk_pipeline.jobs.settings import WorkerSettings
from denialdesk_pipeline.normalize.denials import normalize_transaction

logger = logging.getLogger(__name__)

DEFAULT_BILLER_TIMEZONE = "America/New_York"

EOB_NOT_SUPPORTED_MESSAGE = (
    "Denialdesk can't read EOB PDFs yet. Upload the 835 for this payment if you have it."
)
NO_PAYMENT_DATE_WARNING = (
    "The file has no payment date, so appeal deadlines are estimated from today."
)

Cursor = psycopg.Cursor[dict[str, object]]


class ProcessingCounts(BaseModel):
    claims_total: int = 0
    claims_without_denials: int = 0
    already_in_queue: int = 0
    reversals_seen: int = 0
    denials_created: int = 0


def process_remittance_job(
    connection: psycopg.Connection, job: ClaimedJob, settings: WorkerSettings
) -> None:
    if job.remittance_id is None:
        raise ValueError("process_remittance job has no remittance id")
    remittance = _load_remittance(connection, job.remittance_id)

    if remittance.source != "835":
        _fail_for_biller(connection, job, EOB_NOT_SUPPORTED_MESSAGE)
        return

    file_bytes = read_stored_file(
        settings.storage_dir, remittance.storage_uri, settings.encryption_key
    )
    parse_result = parse_835(file_bytes.decode("utf-8", errors="replace"))
    if parse_result.biller_error is not None:
        logger.info(
            "remittance rejected job_id=%s remittance_id=%s segments=%s",
            job.job_id,
            remittance.remittance_id,
            parse_result.segment_count,
        )
        _fail_for_biller(connection, job, parse_result.biller_error)
        return

    today = _biller_today(connection, remittance.organization_id)
    warnings = list(parse_result.warnings)
    counts = ProcessingCounts()

    with connection.transaction(), connection.cursor(row_factory=dict_row) as cursor:
        for transaction in parse_result.transactions:
            if transaction.payment_date is None and NO_PAYMENT_DATE_WARNING not in warnings:
                warnings.append(NO_PAYMENT_DATE_WARNING)
            _save_transaction(cursor, remittance, transaction, today, counts)
        _finish_remittance(cursor, remittance.remittance_id, warnings, counts)
        mark_job_done(cursor, job.job_id)

    logger.info(
        "remittance processed job_id=%s remittance_id=%s segments=%s denials_created=%s"
        " already_in_queue=%s warnings=%s",
        job.job_id,
        remittance.remittance_id,
        parse_result.segment_count,
        counts.denials_created,
        counts.already_in_queue,
        len(warnings),
    )


def _load_remittance(connection: psycopg.Connection, remittance_id: UUID) -> RemittanceToProcess:
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            "SELECT id, organization_id, source, storage_uri FROM remittances WHERE id = %s",
            (remittance_id,),
        )
        remittance_row = cursor.fetchone()
    connection.commit()
    if remittance_row is None:
        raise ValueError("Remittance for job not found")
    return RemittanceToProcess(
        remittance_id=remittance_row["id"],
        organization_id=remittance_row["organization_id"],
        source=remittance_row["source"],
        storage_uri=remittance_row["storage_uri"],
    )


def _biller_today(connection: psycopg.Connection, organization_id: UUID) -> str:
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            "SELECT timezone FROM users WHERE organization_id = %s ORDER BY created_at LIMIT 1",
            (organization_id,),
        )
        user_row = cursor.fetchone()
    connection.commit()
    timezone_name = DEFAULT_BILLER_TIMEZONE
    if user_row is not None:
        timezone_name = str(user_row["timezone"])
    return datetime.now(ZoneInfo(timezone_name)).date().isoformat()


def _fail_for_biller(connection: psycopg.Connection, job: ClaimedJob, biller_message: str) -> None:
    """The file itself can't be used. Retrying won't help, so the job ends here."""
    with connection.transaction(), connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            UPDATE remittances SET status = 'failed', biller_message = %s, updated_at = now()
            WHERE id = %s
            """,
            (biller_message, job.remittance_id),
        )
        mark_job_done(cursor, job.job_id)


def _save_transaction(
    cursor: Cursor,
    remittance: RemittanceToProcess,
    transaction: Transaction835,
    today: str,
    counts: ProcessingCounts,
) -> None:
    payer = find_or_create_payer(cursor, remittance.organization_id, transaction)
    normalized = normalize_transaction(transaction)
    counts.claims_total += normalized.claims_total
    counts.claims_without_denials += normalized.claims_without_denials
    counts.reversals_seen += normalized.reversals_seen

    payment_date = transaction.payment_date
    payment_date_is_missing = payment_date is None
    if payment_date is None:
        payment_date = today
    for candidate in normalized.denials:
        was_created = insert_denial(
            cursor, remittance, payer, candidate, payment_date, payment_date_is_missing, today
        )
        if was_created:
            counts.denials_created += 1
        else:
            counts.already_in_queue += 1


def _finish_remittance(
    cursor: Cursor, remittance_id: UUID, warnings: list[str], counts: ProcessingCounts
) -> None:
    status = "done"
    biller_message: str | None = None
    if warnings:
        status = "done_with_warnings"
        biller_message = " ".join(warnings)
    elif counts.denials_created == 0 and counts.already_in_queue == 0:
        biller_message = (
            f"No denials in this file. {counts.claims_without_denials} claims were paid in full."
        )

    cursor.execute(
        """
        UPDATE remittances
        SET status = %s, denial_count = %s, result_summary = %s, biller_message = %s,
            updated_at = now()
        WHERE id = %s
        """,
        (
            status,
            counts.denials_created,
            Jsonb(counts.model_dump()),
            biller_message,
            remittance_id,
        ),
    )
