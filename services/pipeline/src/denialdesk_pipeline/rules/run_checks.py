"""Runs every rules check on one draft and gives the overall result. Pure.

A check that raises counts as a fail and is marked `crashed`, so the caller can
log it. A crashed check is never a pass.
"""

from collections.abc import Callable

from pydantic import TypeAdapter, ValidationError

from denialdesk_pipeline.draft.models import AppealLetter, CorrectedClaim, Draft
from denialdesk_pipeline.rules.appeal_checks import (
    CITATIONS_CHECK,
    NO_POLICY_CHECK,
    QUOTES_CHECK,
    REQUIRED_PARTS_CHECK,
    check_citations_exist,
    check_policy_on_file,
    check_quotes_are_real,
    check_required_parts,
)
from denialdesk_pipeline.rules.corrected_claim_checks import (
    CHANGES_JUSTIFIED_CHECK,
    FREQUENCY_CODE_CHECK,
    MODIFIER_ALLOWED_CHECK,
    NCCI_CHECK,
    check_changes_justified,
    check_frequency_code,
    check_modifier_allowed,
    check_ncci_pair_edit,
)
from denialdesk_pipeline.rules.models import (
    CheckOutcome,
    RuleCheck,
    RulesCheckResult,
    RulesContext,
    failed,
    passed,
)
from denialdesk_pipeline.rules.shared_checks import (
    CLAIM_REFERENCES_CHECK,
    DEADLINE_CHECK,
    FACTS_CHECK,
    PLACEHOLDERS_CHECK,
    check_claim_references,
    check_deadline,
    check_facts_respected,
    check_no_placeholders,
)

SCHEMA_CHECK = "Schema valid"
CRASHED_CHECK_REASON = "This check couldn't run."

DRAFT_ADAPTER: TypeAdapter[Draft] = TypeAdapter(Draft)

SharedCheck = Callable[[Draft, RulesContext], RuleCheck]
AppealCheck = Callable[[AppealLetter, RulesContext], RuleCheck]
CorrectedClaimCheck = Callable[[CorrectedClaim, RulesContext], RuleCheck]

SHARED_CHECKS: list[tuple[str, SharedCheck]] = [
    (CLAIM_REFERENCES_CHECK, check_claim_references),
    (PLACEHOLDERS_CHECK, check_no_placeholders),
    (FACTS_CHECK, check_facts_respected),
    (DEADLINE_CHECK, check_deadline),
]

APPEAL_CHECKS: list[tuple[str, AppealCheck]] = [
    (CITATIONS_CHECK, check_citations_exist),
    (QUOTES_CHECK, check_quotes_are_real),
    (REQUIRED_PARTS_CHECK, check_required_parts),
    (NO_POLICY_CHECK, check_policy_on_file),
]

CORRECTED_CLAIM_CHECKS: list[tuple[str, CorrectedClaimCheck]] = [
    (FREQUENCY_CODE_CHECK, check_frequency_code),
    (CHANGES_JUSTIFIED_CHECK, check_changes_justified),
    (MODIFIER_ALLOWED_CHECK, check_modifier_allowed),
    (NCCI_CHECK, check_ncci_pair_edit),
]


def _crashed(name: str) -> RuleCheck:
    return RuleCheck(name=name, outcome="fail", reason=CRASHED_CHECK_REASON, crashed=True)


def _run_shared_checks(draft: Draft, context: RulesContext) -> list[RuleCheck]:
    checks: list[RuleCheck] = []
    for name, check in SHARED_CHECKS:
        try:
            checks.append(check(draft, context))
        except Exception:
            checks.append(_crashed(name))
    return checks


def _run_appeal_checks(letter: AppealLetter, context: RulesContext) -> list[RuleCheck]:
    checks: list[RuleCheck] = []
    for name, check in APPEAL_CHECKS:
        try:
            checks.append(check(letter, context))
        except Exception:
            checks.append(_crashed(name))
    return checks


def _run_corrected_claim_checks(claim: CorrectedClaim, context: RulesContext) -> list[RuleCheck]:
    checks: list[RuleCheck] = []
    for name, check in CORRECTED_CLAIM_CHECKS:
        try:
            checks.append(check(claim, context))
        except Exception:
            checks.append(_crashed(name))
    return checks


def overall_outcome(checks: list[RuleCheck]) -> CheckOutcome:
    outcomes = [check.outcome for check in checks]
    if "fail" in outcomes:
        return "fail"
    if "warn" in outcomes:
        return "warn"
    return "pass"


def check_parsed_draft(draft: Draft, context: RulesContext) -> RulesCheckResult:
    checks = [passed(SCHEMA_CHECK)]
    checks.extend(_run_shared_checks(draft, context))
    if isinstance(draft, AppealLetter):
        checks.extend(_run_appeal_checks(draft, context))
    else:
        checks.extend(_run_corrected_claim_checks(draft, context))
    return RulesCheckResult(overall=overall_outcome(checks), checks=checks)


def check_draft(raw_draft: object, context: RulesContext) -> RulesCheckResult:
    try:
        draft = DRAFT_ADAPTER.validate_python(raw_draft)
    except ValidationError:
        schema_failure = failed(SCHEMA_CHECK, "The draft isn't in the shape Denialdesk expects.")
        return RulesCheckResult(overall="fail", checks=[schema_failure])
    return check_parsed_draft(draft, context)
