"""Worker loop: claim the next job from Postgres, run it, repeat.

Run from services/pipeline: uv run --env-file ../../.env python -m denialdesk_pipeline.jobs.worker
"""

import logging
import time
import uuid

import psycopg

from denialdesk_pipeline.jobs.job_queue import ClaimedJob, claim_next_job, record_job_crash
from denialdesk_pipeline.jobs.process_remittance import process_remittance_job
from denialdesk_pipeline.jobs.settings import WorkerSettings, read_worker_settings

logger = logging.getLogger(__name__)

IDLE_POLL_SECONDS = 2


def run_one_job(connection: psycopg.Connection, settings: WorkerSettings) -> bool:
    """Run the next job if there is one. Returns False when the queue was empty."""
    job = claim_next_job(connection)
    if job is None:
        return False
    try:
        _run_job(connection, job, settings)
    except Exception:
        connection.rollback()
        error_id = uuid.uuid4().hex[:12]
        # Log the error type and ids only. Exception text could echo file contents.
        logger.exception(
            "job crashed job_id=%s remittance_id=%s attempt=%s error_id=%s",
            job.job_id,
            job.remittance_id,
            job.attempts,
            error_id,
        )
        will_retry = record_job_crash(connection, job, error_id)
        logger.info("job crash recorded job_id=%s will_retry=%s", job.job_id, will_retry)
    return True


def _run_job(connection: psycopg.Connection, job: ClaimedJob, settings: WorkerSettings) -> None:
    if job.kind == "process_remittance":
        process_remittance_job(connection, job, settings)
        return
    raise ValueError(f"Unknown job kind {job.kind}")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = read_worker_settings()
    with psycopg.connect(settings.database_url) as connection:
        logger.info("worker started")
        while True:
            ran_a_job = run_one_job(connection, settings)
            if not ran_a_job:
                time.sleep(IDLE_POLL_SECONDS)


if __name__ == "__main__":
    main()
