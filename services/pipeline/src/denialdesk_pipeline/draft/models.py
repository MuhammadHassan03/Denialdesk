"""The two shapes a draft can take. LLM output is parsed into one of these or the draft fails.

`stated_facts` repeats the biller's answers the draft relied on, so the rules
check can compare them with what the biller actually said.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict

BILLER_SIGNATURE_PLACEHOLDER = "[BILLER NAME]"
CORRECTED_CLAIM_FREQUENCY_CODE = "7"


class DraftModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ClaimReferences(DraftModel):
    patient_control_number: str
    payer_claim_control_number: str
    service_date: str | None
    amount_at_stake_cents: int


class PolicyCitation(DraftModel):
    policy_id: str
    quote: str | None


class AppealLetter(DraftModel):
    action: Literal["appeal"]
    recipient_block: str
    subject_line: str
    claim_references: ClaimReferences
    appeal_summary: str
    argument: str
    citations: list[PolicyCitation]
    requested_outcome: str
    attachments: list[str]
    sign_off_block: str
    stated_facts: dict[str, str]


class FieldChange(DraftModel):
    field: str
    old_value: str
    new_value: str
    reason: str


class CorrectedClaim(DraftModel):
    action: Literal["corrected_claim"]
    frequency_code: str
    original_payer_claim_control_number: str
    claim_references: ClaimReferences
    changes: list[FieldChange]
    stated_facts: dict[str, str]


Draft = AppealLetter | CorrectedClaim
