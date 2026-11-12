"""Builds the message the model reads for one draft. Pure."""

import json

from pydantic import BaseModel

from denialdesk_pipeline.draft.llm_client import LlmRequest
from denialdesk_pipeline.draft.models import AppealLetter, CorrectedClaim
from denialdesk_pipeline.draft.prompt_files import DraftAction, Prompt
from denialdesk_pipeline.rules.allowed_changes import ALLOWED_CHANGE_FIELDS
from denialdesk_pipeline.rules.models import PolicyForCheck

APPEAL_OUTPUT_NAME = "appeal_letter"
CORRECTED_CLAIM_OUTPUT_NAME = "corrected_claim"


class DenialForDraft(BaseModel):
    code: str
    code_meaning: str
    payer_name: str
    patient_control_number: str
    payer_claim_control_number: str
    service_date: str | None
    amount_at_stake_cents: int
    rarc_codes: list[str]
    procedure_code: str | None
    procedure_modifiers: list[str]
    line_charge_cents: int | None
    line_paid_cents: int | None


class DraftInput(BaseModel):
    action: DraftAction
    denial: DenialForDraft
    biller_facts: dict[str, str]
    policies: list[PolicyForCheck]


def _user_message(draft_input: DraftInput, problems_to_fix: list[str]) -> str:
    denial = draft_input.denial.model_dump()
    if draft_input.action == "corrected_claim":
        allowed_fields = ALLOWED_CHANGE_FIELDS.get(draft_input.denial.code, frozenset())
        denial["allowed_fields"] = sorted(allowed_fields)
    message: dict[str, object] = {
        "denial": denial,
        "biller_facts": draft_input.biller_facts,
        "policies": [policy.model_dump() for policy in draft_input.policies],
    }
    if problems_to_fix:
        message["problems_in_your_last_draft"] = problems_to_fix
    return json.dumps(message, indent=2)


def build_llm_request(
    draft_input: DraftInput, prompt: Prompt, problems_to_fix: list[str]
) -> LlmRequest:
    if draft_input.action == "appeal":
        output_name = APPEAL_OUTPUT_NAME
        output_description = "The finished appeal letter."
        output_schema = AppealLetter.model_json_schema()
    else:
        output_name = CORRECTED_CLAIM_OUTPUT_NAME
        output_description = "The finished corrected claim."
        output_schema = CorrectedClaim.model_json_schema()
    return LlmRequest(
        system_prompt=prompt.text,
        user_message=_user_message(draft_input, problems_to_fix),
        output_name=output_name,
        output_description=output_description,
        output_schema=output_schema,
    )
