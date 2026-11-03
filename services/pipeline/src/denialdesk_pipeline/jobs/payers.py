"""Match a payer by its 835 payer id, then by exact name, or add a new one."""

from uuid import UUID

import psycopg
from pydantic import BaseModel

from denialdesk_pipeline.intake.x12_835_models import Transaction835

Cursor = psycopg.Cursor[dict[str, object]]


class Payer(BaseModel):
    payer_id: UUID
    appeal_window_days: int | None


def find_or_create_payer(
    cursor: Cursor, organization_id: UUID, transaction: Transaction835
) -> Payer:
    if transaction.payer_identifier is not None:
        cursor.execute(
            """
            SELECT id, appeal_window_days FROM payers
            WHERE organization_id = %s AND payer_identifier = %s
            ORDER BY created_at LIMIT 1
            """,
            (organization_id, transaction.payer_identifier),
        )
        payer_row = cursor.fetchone()
        if payer_row is not None:
            return _payer_from_row(payer_row)

    cursor.execute(
        """
        SELECT id, appeal_window_days FROM payers
        WHERE organization_id = %s AND name = %s
        ORDER BY created_at LIMIT 1
        """,
        (organization_id, transaction.payer_name),
    )
    payer_row = cursor.fetchone()
    if payer_row is not None:
        return _payer_from_row(payer_row)

    cursor.execute(
        """
        INSERT INTO payers (organization_id, name, payer_identifier)
        VALUES (%s, %s, %s)
        RETURNING id, appeal_window_days
        """,
        (organization_id, transaction.payer_name, transaction.payer_identifier),
    )
    created_row = cursor.fetchone()
    if created_row is None:
        raise ValueError("Payer insert returned no row")
    return _payer_from_row(created_row)


def _payer_from_row(payer_row: dict[str, object]) -> Payer:
    return Payer.model_validate(
        {"payer_id": payer_row["id"], "appeal_window_days": payer_row["appeal_window_days"]}
    )
