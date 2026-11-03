"""What the 835 parser hands to normalize/. Amounts are cents, dates are YYYY-MM-DD."""

from pydantic import BaseModel


class Adjustment(BaseModel):
    group_code: str
    reason_code: str
    amount_cents: int


class ServiceLine(BaseModel):
    line_ref: str
    procedure_code: str | None
    procedure_modifiers: list[str]
    charge_cents: int
    paid_cents: int
    service_date: str | None
    adjustments: list[Adjustment]
    remark_codes: list[str]


class ClaimPayment(BaseModel):
    patient_control_number: str
    claim_status_code: str
    charge_cents: int
    paid_cents: int
    payer_claim_control_number: str
    adjustments: list[Adjustment]
    remark_codes: list[str]
    service_start_date: str | None
    service_end_date: str | None
    service_lines: list[ServiceLine]


class Transaction835(BaseModel):
    payer_name: str
    payer_identifier: str | None
    payment_date: str | None
    trace_number: str | None
    claims: list[ClaimPayment]


class Parse835Result(BaseModel):
    transactions: list[Transaction835]
    # Plain-words problems the biller should know about, e.g. a cut-off file.
    warnings: list[str]
    # Set when the file can't be processed at all. Plain words for the biller.
    biller_error: str | None
    segment_count: int
