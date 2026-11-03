"""Parsed 835 claims to denial candidates. Pure: no I/O.

A denial is one claim, one adjustment reason, on one place: the claim itself or
one service line. Payer matching, deadlines and ranking happen later.
"""

from typing import Literal

from pydantic import BaseModel

from denialdesk_pipeline.codes.not_denials import NOT_DENIAL_CODES
from denialdesk_pipeline.codes.supported_codes import denial_code, is_supported_denial_code
from denialdesk_pipeline.intake.x12_835_models import (
    Adjustment,
    ClaimPayment,
    ServiceLine,
    Transaction835,
)

DENIAL_GROUP_CODES = frozenset({"CO", "OA", "PI"})
CLAIM_STATUS_DENIED = "4"
CLAIM_STATUS_REVERSAL = "22"
CLAIM_LEVEL_REF = "claim"

DenialStartStatus = Literal["new", "manual"]


class DenialCandidate(BaseModel):
    patient_control_number: str
    payer_claim_control_number: str
    claim_status_code: str
    group_code: str
    carc_code: str
    rarc_codes: list[str]
    service_line_ref: str
    procedure_code: str | None
    procedure_modifiers: list[str]
    line_charge_cents: int | None
    line_paid_cents: int | None
    claim_charge_cents: int
    claim_paid_cents: int
    amount_at_stake_cents: int
    service_date: str | None
    status: DenialStartStatus


class NormalizedTransaction(BaseModel):
    denials: list[DenialCandidate]
    claims_total: int
    claims_without_denials: int
    reversals_seen: int


def is_denial_adjustment(adjustment: Adjustment, claim_status_code: str) -> bool:
    code = denial_code(adjustment.group_code, adjustment.reason_code)
    if code in NOT_DENIAL_CODES:
        return False
    if adjustment.group_code in DENIAL_GROUP_CODES:
        return True
    return claim_status_code == CLAIM_STATUS_DENIED


def sum_denial_amounts(
    adjustments: list[Adjustment], claim_status_code: str
) -> dict[tuple[str, str], int]:
    """Total cents per (group code, reason code), keeping the order codes first appear in."""
    amounts_by_code: dict[tuple[str, str], int] = {}
    for adjustment in adjustments:
        if not is_denial_adjustment(adjustment, claim_status_code):
            continue
        code_key = (adjustment.group_code, adjustment.reason_code)
        previous_total = amounts_by_code.get(code_key, 0)
        amounts_by_code[code_key] = previous_total + adjustment.amount_cents
    return amounts_by_code


def _start_status(group_code: str, carc_code: str) -> DenialStartStatus:
    if is_supported_denial_code(group_code, carc_code):
        return "new"
    return "manual"


def _claim_level_denials(claim: ClaimPayment) -> list[DenialCandidate]:
    candidates: list[DenialCandidate] = []
    amounts_by_code = sum_denial_amounts(claim.adjustments, claim.claim_status_code)
    for (group_code, carc_code), amount_cents in amounts_by_code.items():
        if amount_cents <= 0:
            continue
        candidates.append(
            DenialCandidate(
                patient_control_number=claim.patient_control_number,
                payer_claim_control_number=claim.payer_claim_control_number,
                claim_status_code=claim.claim_status_code,
                group_code=group_code,
                carc_code=carc_code,
                rarc_codes=list(claim.remark_codes),
                service_line_ref=CLAIM_LEVEL_REF,
                procedure_code=None,
                procedure_modifiers=[],
                line_charge_cents=None,
                line_paid_cents=None,
                claim_charge_cents=claim.charge_cents,
                claim_paid_cents=claim.paid_cents,
                amount_at_stake_cents=amount_cents,
                service_date=claim.service_start_date,
                status=_start_status(group_code, carc_code),
            )
        )
    return candidates


def _line_denials(claim: ClaimPayment, line: ServiceLine) -> list[DenialCandidate]:
    candidates: list[DenialCandidate] = []
    amounts_by_code = sum_denial_amounts(line.adjustments, claim.claim_status_code)
    rarc_codes = line.remark_codes + claim.remark_codes
    service_date = line.service_date or claim.service_start_date
    for (group_code, carc_code), amount_cents in amounts_by_code.items():
        if amount_cents <= 0:
            continue
        candidates.append(
            DenialCandidate(
                patient_control_number=claim.patient_control_number,
                payer_claim_control_number=claim.payer_claim_control_number,
                claim_status_code=claim.claim_status_code,
                group_code=group_code,
                carc_code=carc_code,
                rarc_codes=list(rarc_codes),
                service_line_ref=line.line_ref,
                procedure_code=line.procedure_code,
                procedure_modifiers=list(line.procedure_modifiers),
                line_charge_cents=line.charge_cents,
                line_paid_cents=line.paid_cents,
                claim_charge_cents=claim.charge_cents,
                claim_paid_cents=claim.paid_cents,
                amount_at_stake_cents=amount_cents,
                service_date=service_date,
                status=_start_status(group_code, carc_code),
            )
        )
    return candidates


def find_claim_denials(claim: ClaimPayment) -> list[DenialCandidate]:
    if claim.claim_status_code == CLAIM_STATUS_REVERSAL:
        return []
    candidates = _claim_level_denials(claim)
    for line in claim.service_lines:
        candidates.extend(_line_denials(claim, line))
    return candidates


def normalize_transaction(transaction: Transaction835) -> NormalizedTransaction:
    denials: list[DenialCandidate] = []
    claims_without_denials = 0
    reversals_seen = 0
    for claim in transaction.claims:
        if claim.claim_status_code == CLAIM_STATUS_REVERSAL:
            reversals_seen += 1
            continue
        claim_denials = find_claim_denials(claim)
        if not claim_denials:
            claims_without_denials += 1
        denials.extend(claim_denials)
    return NormalizedTransaction(
        denials=denials,
        claims_total=len(transaction.claims),
        claims_without_denials=claims_without_denials,
        reversals_seen=reversals_seen,
    )
