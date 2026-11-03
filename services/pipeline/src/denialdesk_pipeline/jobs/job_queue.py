"""Claim, finish and retry rows in the Postgres jobs table."""

from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from pydantic import BaseModel

MAX_JOB_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 60
# A running job whose worker hasn't finished in this long is treated as crashed.
STALE_JOB_SECONDS = 600

PROCESSING_FAILED_MESSAGE = (
    "Processing failed after 3 tries. Click Try again, and if it keeps failing,"
    " contact support with the error ID."
)


class ClaimedJob(BaseModel):
    job_id: UUID
    kind: str
    remittance_id: UUID | None
    attempts: int


CLAIM_NEXT_JOB_SQL = """
UPDATE jobs
SET status = 'running', attempts = attempts + 1, locked_at = now(), updated_at = now()
WHERE id = (
    SELECT id FROM jobs
    WHERE (status = 'queued' AND run_after <= now())
       OR (status = 'running' AND locked_at < now() - make_interval(secs => %(stale_seconds)s))
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
RETURNING id, kind, remittance_id, attempts
"""


def claim_next_job(connection: psycopg.Connection) -> ClaimedJob | None:
    """Claim the oldest runnable job and commit, so the upload list can show "Processing"."""
    with connection.transaction(), connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(CLAIM_NEXT_JOB_SQL, {"stale_seconds": STALE_JOB_SECONDS})
        job_row = cursor.fetchone()
        if job_row is None:
            return None
        if job_row["remittance_id"] is not None:
            cursor.execute(
                "UPDATE remittances SET status = 'processing', updated_at = now() WHERE id = %s",
                (job_row["remittance_id"],),
            )
    return ClaimedJob(
        job_id=job_row["id"],
        kind=job_row["kind"],
        remittance_id=job_row["remittance_id"],
        attempts=job_row["attempts"],
    )


def mark_job_done(cursor: psycopg.Cursor[dict[str, object]], job_id: UUID) -> None:
    cursor.execute(
        "UPDATE jobs SET status = 'done', locked_at = NULL, updated_at = now() WHERE id = %s",
        (job_id,),
    )


def record_job_crash(connection: psycopg.Connection, job: ClaimedJob, error_id: str) -> bool:
    """Queue the job again with a back-off, or fail it for good. Returns True if it will retry."""
    will_retry = job.attempts < MAX_JOB_ATTEMPTS
    with connection.transaction(), connection.cursor() as cursor:
        if will_retry:
            backoff_seconds = RETRY_BACKOFF_SECONDS * job.attempts
            cursor.execute(
                """
                UPDATE jobs SET status = 'queued', locked_at = NULL, last_error_id = %s,
                    run_after = now() + make_interval(secs => %s), updated_at = now()
                WHERE id = %s
                """,
                (error_id, backoff_seconds, job.job_id),
            )
            cursor.execute(
                "UPDATE remittances SET status = 'queued', updated_at = now() WHERE id = %s",
                (job.remittance_id,),
            )
            return True

        cursor.execute(
            """
            UPDATE jobs SET status = 'failed', locked_at = NULL, last_error_id = %s,
                updated_at = now()
            WHERE id = %s
            """,
            (error_id, job.job_id),
        )
        cursor.execute(
            """
            UPDATE remittances SET status = 'failed', error_id = %s, biller_message = %s,
                updated_at = now()
            WHERE id = %s
            """,
            (error_id, PROCESSING_FAILED_MESSAGE, job.remittance_id),
        )
    return False
