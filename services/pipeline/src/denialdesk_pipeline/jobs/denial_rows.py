"""Insert one Denial row and its denial_created audit event."""

from uuid import uuid4

import psycopg
from psycopg.types.json import Jsonb

from denialdesk_pipeline.jobs.payers import Payer
from denialdesk_pipeline.jobs.remittance_models import RemittanceToProcess
from denialdesk_pipeline.normalize.deadline import compute_appeal_deadline
from denialdesk_pipeline.normalize.denials import DenialCandidate
from denialdesk_pipeline.rank.priority import priority_bucket, rank_key

Cursor = psycopg.Cursor[dict[str, object]]


INSERT_DENIAL_SQL = """
INSERT INTO denials (
    id, organization_id, remittance_id, payer_id, patient_control_number,
    payer_claim_control_number, claim_status_code, group_code, carc_code, rarc_codes,
    service_line_ref, procedure_code, procedure_modifiers, line_charge_cents, line_paid_cents,
    claim_charge_cents, claim_paid_cents, amount_at_stake_cents, service_date, payment_date,
    appeal_deadline, deadline_is_estimate, status, priority_bucket, rank_key
) VALUES (
    %(id)s, %(organization_id)s, %(remittance_id)s, %(payer_id)s, %(patient_control_number)s,
    %(payer_claim_control_number)s, %(claim_status_code)s, %(group_code)s, %(carc_code)s,
    %(rarc_codes)s, %(service_line_ref)s, %(procedure_code)s, %(procedure_modifiers)s,
    %(line_charge_cents)s, %(line_paid_cents)s, %(claim_charge_cents)s, %(claim_paid_cents)s,
    %(amount_at_stake_cents)s, %(service_date)s, %(payment_date)s, %(appeal_deadline)s,
    %(deadline_is_estimate)s, %(status)s, %(priority_bucket)s, %(rank_key)s
)
ON CONFLICT (payer_id, payer_claim_control_number, group_code, carc_code, service_line_ref)
DO NOTHING
RETURNING id
"""


def insert_denial(
    cursor: Cursor,
    remittance: RemittanceToProcess,
    payer: Payer,
    candidate: DenialCandidate,
    payment_date: str,
    payment_date_is_missing: bool,
    today: str,
) -> bool:
    """Insert one denial with its audit event. Returns False if it was already in the queue."""
    deadline = compute_appeal_deadline(payment_date, payer.appeal_window_days)
    deadline_is_estimate = deadline.is_estimate or payment_date_is_missing
    denial_id = str(uuid4())
    denial_values = candidate.model_dump()
    denial_values.update(
        {
            "id": denial_id,
            "organization_id": remittance.organization_id,
            "remittance_id": remittance.remittance_id,
            "payer_id": payer.payer_id,
            "payment_date": payment_date,
            "appeal_deadline": deadline.appeal_deadline,
            "deadline_is_estimate": deadline_is_estimate,
            "priority_bucket": priority_bucket(deadline.appeal_deadline, today),
            "rank_key": rank_key(
                candidate.amount_at_stake_cents, deadline.appeal_deadline, denial_id
            ),
        }
    )
    cursor.execute(INSERT_DENIAL_SQL, denial_values)
    if cursor.fetchone() is None:
        return False

    cursor.execute(
        """
        INSERT INTO audit_events (organization_id, actor, denial_id, remittance_id, action, details)
        VALUES (%s, 'system', %s, %s, 'denial_created', %s)
        """,
        (
            remittance.organization_id,
            denial_id,
            remittance.remittance_id,
            Jsonb({"status": candidate.status}),
        ),
    )
    return True
