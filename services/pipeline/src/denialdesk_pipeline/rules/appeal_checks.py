"""Checks that apply only to appeal letters. Pure."""

from denialdesk_pipeline.draft.models import AppealLetter
from denialdesk_pipeline.rules.models import (
    PolicyForCheck,
    RuleCheck,
    RulesContext,
    failed,
    passed,
    warned,
)
from denialdesk_pipeline.rules.text import collapse_whitespace, quoted_passages

CITATIONS_CHECK = "Citations exist"
QUOTES_CHECK = "Quotes are real"
REQUIRED_PARTS_CHECK = "Required parts present"
NO_POLICY_CHECK = "No policy on file"

QUOTE_PREVIEW_LENGTH = 60


def _policies_by_id(policies: list[PolicyForCheck]) -> dict[str, PolicyForCheck]:
    by_id: dict[str, PolicyForCheck] = {}
    for policy in policies:
        by_id[policy.policy_id] = policy
    return by_id


def check_citations_exist(letter: AppealLetter, context: RulesContext) -> RuleCheck:
    known_policies = _policies_by_id(context.policies)
    unknown_ids: list[str] = []
    for citation in letter.citations:
        if citation.policy_id not in known_policies and citation.policy_id not in unknown_ids:
            unknown_ids.append(citation.policy_id)
    if not unknown_ids:
        return passed(CITATIONS_CHECK)
    listed = ", ".join(unknown_ids)
    return failed(CITATIONS_CHECK, f"We have no policy on file for this payer with id: {listed}.")


def _preview(quote: str) -> str:
    if len(quote) <= QUOTE_PREVIEW_LENGTH:
        return quote
    return quote[:QUOTE_PREVIEW_LENGTH] + "..."


def _cited_policy_texts(letter: AppealLetter, context: RulesContext) -> list[str]:
    known_policies = _policies_by_id(context.policies)
    texts: list[str] = []
    for citation in letter.citations:
        if citation.policy_id in known_policies:
            texts.append(collapse_whitespace(known_policies[citation.policy_id].text))
    return texts


def _quotes_in_letter(letter: AppealLetter) -> list[str]:
    quotes: list[str] = []
    for citation in letter.citations:
        if citation.quote is not None:
            quotes.append(citation.quote)
    for text in (letter.appeal_summary, letter.argument, letter.requested_outcome):
        quotes.extend(quoted_passages(text))
    return quotes


def _is_in_any_policy(quote: str, policy_texts: list[str]) -> bool:
    wanted = collapse_whitespace(quote)
    return any(wanted in policy_text for policy_text in policy_texts)


def check_quotes_are_real(letter: AppealLetter, context: RulesContext) -> RuleCheck:
    policy_texts = _cited_policy_texts(letter, context)
    for quote in _quotes_in_letter(letter):
        if collapse_whitespace(quote) == "":
            continue
        if not _is_in_any_policy(quote, policy_texts):
            return failed(
                QUOTES_CHECK,
                f'This quote isn\'t in the cited policy word for word: "{_preview(quote)}"',
            )
    return passed(QUOTES_CHECK)


def check_required_parts(letter: AppealLetter, context: RulesContext) -> RuleCheck:
    missing: list[str] = []
    if letter.subject_line.strip() == "":
        missing.append("subject")
    if letter.appeal_summary.strip() == "":
        missing.append("what is being appealed")
    if letter.argument.strip() == "":
        missing.append("argument")
    if letter.requested_outcome.strip() == "":
        missing.append("requested outcome")
    if not letter.attachments:
        missing.append("attachment list")
    if not missing:
        return passed(REQUIRED_PARTS_CHECK)
    listed = ", ".join(missing)
    return failed(REQUIRED_PARTS_CHECK, f"The letter is missing: {listed}.")


def check_policy_on_file(letter: AppealLetter, context: RulesContext) -> RuleCheck:
    if context.policies:
        return passed(NO_POLICY_CHECK)
    return warned(
        NO_POLICY_CHECK,
        "No payer policy on file. Check this letter against the payer's current policy "
        "before sending.",
    )
