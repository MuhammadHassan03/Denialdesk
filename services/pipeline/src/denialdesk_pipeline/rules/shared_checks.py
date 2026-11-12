"""Checks that apply to every draft, appeal or corrected claim. Pure."""

from datetime import date

from denialdesk_pipeline.draft.models import (
    BILLER_SIGNATURE_PLACEHOLDER,
    AppealLetter,
    ClaimReferences,
    CorrectedClaim,
    Draft,
)
from denialdesk_pipeline.rules.allowed_changes import MODIFIER_FIELD
from denialdesk_pipeline.rules.models import (
    DenialForCheck,
    RuleCheck,
    RulesContext,
    failed,
    passed,
    warned,
)
from denialdesk_pipeline.rules.text import leftover_placeholders

CLAIM_REFERENCES_CHECK = "Claim references correct"
PLACEHOLDERS_CHECK = "No leftover placeholders"
FACTS_CHECK = "Facts respected"
DEADLINE_CHECK = "Deadline"

AUTH_OBTAINED_FACT = "authObtained"
AUTH_NUMBER_FACT = "authNumber"
MODIFIER_FACT = "modifier"


def _reference_differences(references: ClaimReferences, denial: DenialForCheck) -> list[str]:
    differences: list[str] = []
    if references.patient_control_number != denial.patient_control_number:
        differences.append("claim number")
    if references.payer_claim_control_number != denial.payer_claim_control_number:
        differences.append("payer claim control number")
    if references.service_date != denial.service_date:
        differences.append("service date")
    if references.amount_at_stake_cents != denial.amount_at_stake_cents:
        differences.append("amount")
    return differences


def check_claim_references(draft: Draft, context: RulesContext) -> RuleCheck:
    differences = _reference_differences(draft.claim_references, context.denial)
    if not differences:
        return passed(CLAIM_REFERENCES_CHECK)
    listed = ", ".join(differences)
    return failed(CLAIM_REFERENCES_CHECK, f"These don't match the denial record: {listed}.")


def _appeal_texts(letter: AppealLetter) -> list[str]:
    sign_off_without_signature = letter.sign_off_block.replace(BILLER_SIGNATURE_PLACEHOLDER, "")
    texts = [
        letter.recipient_block,
        letter.subject_line,
        letter.appeal_summary,
        letter.argument,
        letter.requested_outcome,
        sign_off_without_signature,
    ]
    texts.extend(letter.attachments)
    return texts


def _corrected_claim_texts(claim: CorrectedClaim) -> list[str]:
    texts: list[str] = []
    for change in claim.changes:
        texts.append(change.old_value)
        texts.append(change.new_value)
        texts.append(change.reason)
    return texts


def check_no_placeholders(draft: Draft, context: RulesContext) -> RuleCheck:
    if isinstance(draft, AppealLetter):
        texts = _appeal_texts(draft)
    else:
        texts = _corrected_claim_texts(draft)
    found: list[str] = []
    for text in texts:
        for placeholder in leftover_placeholders(text):
            if placeholder not in found:
                found.append(placeholder)
    if not found:
        return passed(PLACEHOLDERS_CHECK)
    listed = ", ".join(found)
    return failed(PLACEHOLDERS_CHECK, f"Placeholder text is still in the draft: {listed}.")


def _stated_fact_problem(draft: Draft, biller_facts: dict[str, str]) -> str | None:
    for fact_name, biller_answer in biller_facts.items():
        if fact_name not in draft.stated_facts:
            return f'The draft doesn\'t say what it assumed for "{fact_name}".'
        stated_answer = draft.stated_facts[fact_name]
        if stated_answer != biller_answer:
            return (
                f'The draft assumes "{stated_answer}" for "{fact_name}", '
                f'but you answered "{biller_answer}".'
            )
    return None


def _auth_number_problem(draft: Draft, biller_facts: dict[str, str]) -> str | None:
    if not isinstance(draft, AppealLetter):
        return None
    if biller_facts.get(AUTH_OBTAINED_FACT) != "yes":
        return None
    auth_number = biller_facts.get(AUTH_NUMBER_FACT, "")
    if auth_number == "" or auth_number in draft.argument:
        return None
    return f"The letter doesn't mention the authorization number you gave ({auth_number})."


def _modifier_problem(draft: Draft, biller_facts: dict[str, str]) -> str | None:
    if not isinstance(draft, CorrectedClaim):
        return None
    biller_modifier = biller_facts.get(MODIFIER_FACT, "")
    if biller_modifier == "":
        return None
    for change in draft.changes:
        if change.field == MODIFIER_FIELD and change.new_value != biller_modifier:
            return (
                f"The draft sets modifier {change.new_value}, "
                f"but you chose modifier {biller_modifier}."
            )
    return None


def check_facts_respected(draft: Draft, context: RulesContext) -> RuleCheck:
    problem_finders = (_stated_fact_problem, _auth_number_problem, _modifier_problem)
    for find_problem in problem_finders:
        problem = find_problem(draft, context.biller_facts)
        if problem is not None:
            return failed(FACTS_CHECK, problem)
    return passed(FACTS_CHECK)


def check_deadline(draft: Draft, context: RulesContext) -> RuleCheck:
    deadline = date.fromisoformat(context.denial.appeal_deadline)
    if deadline < date.fromisoformat(context.today):
        return warned(
            DEADLINE_CHECK,
            f"The appeal deadline ({context.denial.appeal_deadline}) has passed. "
            "You can still send this, but the payer may reject it as late.",
        )
    return passed(DEADLINE_CHECK)
