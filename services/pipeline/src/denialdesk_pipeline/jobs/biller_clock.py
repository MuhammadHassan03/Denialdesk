"""Today's date where the biller is. Deadlines and days left are counted in their timezone."""

from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row

DEFAULT_BILLER_TIMEZONE = "America/New_York"


def biller_today(connection: psycopg.Connection, organization_id: UUID) -> str:
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
