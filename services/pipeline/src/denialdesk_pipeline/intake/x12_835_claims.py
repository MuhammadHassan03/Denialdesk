"""835 claim loop: CLP and the segments under it (CAS, MOA, LQ, DTM, SVC)."""

from denialdesk_pipeline.intake.x12_835_models import (
    Adjustment,
    ClaimPayment,
    ServiceLine,
    Transaction835,
)
from denialdesk_pipeline.intake.x12_835_state import ParseState, Separators, element
from denialdesk_pipeline.intake.x12_values import parse_amount_cents, parse_x12_date

LINE_ITEM_CONTROL_QUALIFIER = "6R"
REMARK_CODE_QUALIFIER = "HE"
CLAIM_START_DATE_QUALIFIER = "232"
CLAIM_END_DATE_QUALIFIER = "233"
SERVICE_DATE_QUALIFIER = "472"
CAS_ELEMENTS_PER_ADJUSTMENT = 3
MOA_FIRST_REMARK_INDEX = 3
MOA_LAST_REMARK_INDEX = 7


def start_claim(elements: list[str], state: ParseState, transaction: Transaction835) -> None:
    state.in_payer_loop = False
    state.line = None
    claim = ClaimPayment(
        patient_control_number=element(elements, 1),
        claim_status_code=element(elements, 2),
        charge_cents=parse_amount_cents(element(elements, 3) or "0"),
        paid_cents=parse_amount_cents(element(elements, 4) or "0"),
        payer_claim_control_number=element(elements, 7),
        adjustments=[],
        remark_codes=[],
        service_start_date=None,
        service_end_date=None,
        service_lines=[],
    )
    transaction.claims.append(claim)
    state.claim = claim


def read_adjustments(elements: list[str], state: ParseState) -> None:
    group_code = element(elements, 1)
    adjustments: list[Adjustment] = []
    for reason_index in range(2, len(elements), CAS_ELEMENTS_PER_ADJUSTMENT):
        reason_code = element(elements, reason_index)
        if reason_code == "":
            continue
        amount_text = element(elements, reason_index + 1) or "0"
        adjustments.append(
            Adjustment(
                group_code=group_code,
                reason_code=reason_code,
                amount_cents=parse_amount_cents(amount_text),
            )
        )

    if state.line is not None:
        state.line.adjustments.extend(adjustments)
    elif state.claim is not None:
        state.claim.adjustments.extend(adjustments)


def read_claim_remarks(elements: list[str], state: ParseState) -> None:
    if state.claim is None:
        return
    for remark_index in range(MOA_FIRST_REMARK_INDEX, MOA_LAST_REMARK_INDEX + 1):
        remark_code = element(elements, remark_index)
        if remark_code != "":
            state.claim.remark_codes.append(remark_code)


def read_line_remark(elements: list[str], state: ParseState) -> None:
    if element(elements, 1) != REMARK_CODE_QUALIFIER:
        return
    remark_code = element(elements, 2)
    if remark_code == "":
        return
    if state.line is not None:
        state.line.remark_codes.append(remark_code)
    elif state.claim is not None:
        state.claim.remark_codes.append(remark_code)


def read_date(elements: list[str], state: ParseState) -> None:
    qualifier = element(elements, 1)
    date_text = element(elements, 2)
    if date_text == "":
        return
    if qualifier == SERVICE_DATE_QUALIFIER and state.line is not None:
        state.line.service_date = parse_x12_date(date_text)
    elif qualifier == CLAIM_START_DATE_QUALIFIER and state.claim is not None:
        state.claim.service_start_date = parse_x12_date(date_text)
    elif qualifier == CLAIM_END_DATE_QUALIFIER and state.claim is not None:
        state.claim.service_end_date = parse_x12_date(date_text)


def start_service_line(elements: list[str], separators: Separators, state: ParseState) -> None:
    claim = state.claim
    if claim is None:
        return
    procedure_parts = element(elements, 1).split(separators.sub_element)
    procedure_code = element(procedure_parts, 1) or None
    procedure_modifiers: list[str] = []
    for modifier in procedure_parts[2:]:
        if modifier != "":
            procedure_modifiers.append(modifier)

    line_position = len(claim.service_lines) + 1
    line = ServiceLine(
        line_ref=f"line-{line_position}",
        procedure_code=procedure_code,
        procedure_modifiers=procedure_modifiers,
        charge_cents=parse_amount_cents(element(elements, 2) or "0"),
        paid_cents=parse_amount_cents(element(elements, 3) or "0"),
        service_date=None,
        adjustments=[],
        remark_codes=[],
    )
    claim.service_lines.append(line)
    state.line = line
