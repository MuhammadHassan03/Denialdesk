"""Appeal deadline from the payment date and the payer's appeal window. Pure."""

from datetime import date, timedelta

from pydantic import BaseModel

DEFAULT_APPEAL_WINDOW_DAYS = 90


class AppealDeadline(BaseModel):
    appeal_deadline: str
    is_estimate: bool


def compute_appeal_deadline(payment_date: str, appeal_window_days: int | None) -> AppealDeadline:
    payment_day = date.fromisoformat(payment_date)
    if appeal_window_days is None:
        deadline_day = payment_day + timedelta(days=DEFAULT_APPEAL_WINDOW_DAYS)
        return AppealDeadline(appeal_deadline=deadline_day.isoformat(), is_estimate=True)
    deadline_day = payment_day + timedelta(days=appeal_window_days)
    return AppealDeadline(appeal_deadline=deadline_day.isoformat(), is_estimate=False)
