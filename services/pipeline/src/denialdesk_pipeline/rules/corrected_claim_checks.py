"""Checks that apply only to corrected claims. Pure."""

from denialdesk_pipeline.draft.models import CORRECTED_CLAIM_FREQUENCY_CODE, CorrectedClaim
from denialdesk_pipeline.rules.allowed_changes import (
    ALLOWED_CHANGE_FIELDS,
    MODIFIER_FIELD,
    PROCEDURE_CODE_FIELD,
)
from denialdesk_pipeline.rules.allowed_modifiers import ALLOWED_MODIFIERS, NCCI_BYPASS_MODIFIERS
from denialdesk_pipeline.rules.models import NcciEdit, RuleCheck, RulesContext, failed, passed

FREQUENCY_CODE_CHECK = "Frequency code"
CHANGES_JUSTIFIED_CHECK = "Changes are justified"
MODIFIER_ALLOWED_CHECK = "Modifier allowed"
NCCI_CHECK = "NCCI pair edit"


def check_frequency_code(claim: CorrectedClaim, context: RulesContext) -> RuleCheck:
    if claim.frequency_code != CORRECTED_CLAIM_FREQUENCY_CODE:
        return failed(
            FREQUENCY_CODE_CHECK,
            f"A corrected claim needs frequency code {CORRECTED_CLAIM_FREQUENCY_CODE}, "
            f"not {claim.frequency_code}.",
        )
    if claim.original_payer_claim_control_number != context.denial.payer_claim_control_number:
        return failed(
            FREQUENCY_CODE_CHECK,
            "The original payer claim control number is missing or doesn't match the denial.",
        )
    return passed(FREQUENCY_CODE_CHECK)


def check_changes_justified(claim: CorrectedClaim, context: RulesContext) -> RuleCheck:
    if context.denial.code not in ALLOWED_CHANGE_FIELDS:
        return failed(
            CHANGES_JUSTIFIED_CHECK,
            f"{context.denial.code} isn't fixed with a corrected claim.",
        )
    if not claim.changes:
        return failed(CHANGES_JUSTIFIED_CHECK, "The corrected claim doesn't change anything.")
    allowed_fields = ALLOWED_CHANGE_FIELDS[context.denial.code]
    for change in claim.changes:
        if change.field not in allowed_fields:
            return failed(
                CHANGES_JUSTIFIED_CHECK,
                f'A {context.denial.code} fix can\'t change the field "{change.field}".',
            )
        if change.reason.strip() == "":
            return failed(
                CHANGES_JUSTIFIED_CHECK,
                f'The change to "{change.field}" has no reason.',
            )
    return passed(CHANGES_JUSTIFIED_CHECK)


def check_modifier_allowed(claim: CorrectedClaim, context: RulesContext) -> RuleCheck:
    for change in claim.changes:
        if change.field == MODIFIER_FIELD and change.new_value not in ALLOWED_MODIFIERS:
            return failed(
                MODIFIER_ALLOWED_CHECK,
                f"Modifier {change.new_value} isn't in the allowed modifier list.",
            )
    return passed(MODIFIER_ALLOWED_CHECK)


def _modifiers_after_changes(claim: CorrectedClaim, context: RulesContext) -> list[str]:
    modifiers = list(context.denial.line_modifiers)
    for change in claim.changes:
        if change.field == MODIFIER_FIELD:
            modifiers.append(change.new_value)
    return modifiers


def _matching_edit(new_code: str, other_code: str, edits: list[NcciEdit]) -> NcciEdit | None:
    for edit in edits:
        codes_in_edit = {edit.column_one_code, edit.column_two_code}
        if codes_in_edit == {new_code, other_code}:
            return edit
    return None


def _has_bypass_modifier(modifiers: list[str]) -> bool:
    return any(modifier in NCCI_BYPASS_MODIFIERS for modifier in modifiers)


def check_ncci_pair_edit(claim: CorrectedClaim, context: RulesContext) -> RuleCheck:
    modifiers = _modifiers_after_changes(claim, context)
    for change in claim.changes:
        if change.field != PROCEDURE_CODE_FIELD:
            continue
        for other_code in context.denial.other_procedure_codes_on_claim:
            edit = _matching_edit(change.new_value, other_code, context.ncci_edits)
            if edit is None:
                continue
            if not edit.modifier_allowed:
                return failed(
                    NCCI_CHECK,
                    f"{change.new_value} and {other_code} can't be billed together (NCCI edit), "
                    "and no modifier lifts this edit.",
                )
            if not _has_bypass_modifier(modifiers):
                return failed(
                    NCCI_CHECK,
                    f"{change.new_value} and {other_code} are an NCCI pair. "
                    "They need a modifier that shows the services were separate.",
                )
    return passed(NCCI_CHECK)
