from denialdesk_pipeline.rules.models import NcciEdit, RuleCheck, RulesCheckResult
from denialdesk_pipeline.rules.run_checks import check_draft
from tests.rules.drafts import appeal, claim_references, context, corrected_claim


def check_named(result: RulesCheckResult, name: str) -> RuleCheck:
    for check in result.checks:
        if check.name == name:
            return check
    raise AssertionError(f"No check named {name}")


def test_good_appeal_passes_every_check() -> None:
    result = check_draft(appeal(), context())

    assert result.overall == "pass"
    assert len(result.checks) == 9


def test_good_corrected_claim_passes_every_check() -> None:
    result = check_draft(corrected_claim(), context(code="CO-4"))

    assert result.overall == "pass"
    assert len(result.checks) == 9


def test_draft_in_the_wrong_shape_fails_schema_check() -> None:
    result = check_draft({"action": "appeal", "argument": "Pay us."}, context())

    assert result.overall == "fail"
    assert check_named(result, "Schema valid").outcome == "fail"


def test_wrong_claim_number_and_amount_fail() -> None:
    references = claim_references()
    references["patient_control_number"] = "CLM-99999"
    references["amount_at_stake_cents"] = 100

    result = check_draft(appeal(claim_references=references), context())

    check = check_named(result, "Claim references correct")
    assert check.outcome == "fail"
    assert "claim number" in check.reason
    assert "amount" in check.reason


def test_invented_citation_fails() -> None:
    draft = appeal(citations=[{"policy_id": "NW-MADE-UP-1", "quote": None}])

    result = check_draft(draft, context())

    assert check_named(result, "Citations exist").outcome == "fail"
    assert result.overall == "fail"


def test_invented_quote_in_the_argument_fails() -> None:
    draft = appeal(argument='AUTH-88213 applies. Your policy says "all claims are always paid."')

    result = check_draft(draft, context())

    assert check_named(result, "Quotes are real").outcome == "fail"


def test_invented_quote_on_a_citation_fails() -> None:
    draft = appeal(citations=[{"policy_id": "NW-PA-2026-04", "quote": "Appeals never expire."}])

    result = check_draft(draft, context())

    assert check_named(result, "Quotes are real").outcome == "fail"


def test_quote_with_different_line_breaks_still_matches() -> None:
    draft = appeal(
        citations=[
            {
                "policy_id": "NW-PA-2026-04",
                "quote": "Requests for reconsideration\nmust include the authorization number.",
            }
        ]
    )

    assert check_named(check_draft(draft, context()), "Quotes are real").outcome == "pass"


def test_missing_parts_fail() -> None:
    result = check_draft(appeal(requested_outcome=" ", attachments=[]), context())

    check = check_named(result, "Required parts present")
    assert check.outcome == "fail"
    assert "requested outcome" in check.reason
    assert "attachment list" in check.reason


def test_leftover_placeholder_fails_but_signature_placeholder_is_fine() -> None:
    result = check_draft(appeal(recipient_block="[PAYER ADDRESS]"), context())

    assert check_named(result, "No leftover placeholders").outcome == "fail"
    assert check_named(check_draft(appeal(), context()), "No leftover placeholders").outcome == (
        "pass"
    )


def test_draft_that_contradicts_the_biller_fails() -> None:
    facts = {"authObtained": "yes", "authNumber": "AUTH-88213"}
    agreeing = appeal(stated_facts=facts)
    contradicting = appeal(stated_facts={"authObtained": "no", "authNumber": "AUTH-88213"})
    silent = appeal(stated_facts={})

    assert (
        check_named(check_draft(agreeing, context(biller_facts=facts)), "Facts respected").outcome
        == "pass"
    )
    assert (
        check_named(
            check_draft(contradicting, context(biller_facts=facts)), "Facts respected"
        ).outcome
        == "fail"
    )
    assert (
        check_named(check_draft(silent, context(biller_facts=facts)), "Facts respected").outcome
        == "fail"
    )


def test_letter_that_leaves_out_the_auth_number_fails() -> None:
    facts = {"authObtained": "yes", "authNumber": "AUTH-55555"}

    result = check_draft(appeal(stated_facts=facts), context(biller_facts=facts))

    check = check_named(result, "Facts respected")
    assert check.outcome == "fail"
    assert "AUTH-55555" in check.reason


def test_modifier_different_from_the_billers_choice_fails() -> None:
    facts = {"modifierKnown": "yes", "modifier": "59"}

    result = check_draft(
        corrected_claim(stated_facts=facts), context(code="CO-4", biller_facts=facts)
    )

    assert check_named(result, "Facts respected").outcome == "fail"


def test_passed_deadline_warns_and_does_not_fail() -> None:
    result = check_draft(appeal(), context(appeal_deadline="2026-11-03"))

    assert check_named(result, "Deadline").outcome == "warn"
    assert result.overall == "warn"


def test_no_policy_on_file_warns() -> None:
    draft = appeal(argument="Authorization AUTH-88213 was issued before the service.", citations=[])

    result = check_draft(draft, context(policies=[]))

    assert check_named(result, "No policy on file").outcome == "warn"
    assert result.overall == "warn"


def test_wrong_frequency_code_fails() -> None:
    result = check_draft(corrected_claim(frequency_code="1"), context(code="CO-4"))

    assert check_named(result, "Frequency code").outcome == "fail"


def test_missing_original_claim_control_number_fails() -> None:
    draft = corrected_claim(original_payer_claim_control_number="")

    assert check_named(check_draft(draft, context(code="CO-4")), "Frequency code").outcome == "fail"


def test_change_without_reason_or_to_a_field_the_code_does_not_allow_fails() -> None:
    no_reason = corrected_claim(
        changes=[{"field": "modifier", "old_value": "", "new_value": "25", "reason": ""}]
    )
    wrong_field = corrected_claim(
        changes=[{"field": "member_id", "old_value": "A1", "new_value": "A2", "reason": "Typo."}]
    )

    for draft in (no_reason, wrong_field, corrected_claim(changes=[])):
        result = check_draft(draft, context(code="CO-4"))
        assert check_named(result, "Changes are justified").outcome == "fail"


def test_corrected_claim_for_a_code_that_is_only_appealed_fails() -> None:
    result = check_draft(corrected_claim(), context(code="CO-50"))

    assert check_named(result, "Changes are justified").outcome == "fail"


def test_unknown_modifier_fails() -> None:
    draft = corrected_claim(
        changes=[{"field": "modifier", "old_value": "", "new_value": "ZZ", "reason": "Needed."}]
    )

    assert (
        check_named(check_draft(draft, context(code="CO-4")), "Modifier allowed").outcome == "fail"
    )


def test_ncci_pair_fails_without_a_modifier_and_passes_with_one() -> None:
    edits = [NcciEdit(column_one_code="11042", column_two_code="97597", modifier_allowed=True)]
    code_change = {
        "field": "procedure_code",
        "old_value": "11043",
        "new_value": "97597",
        "reason": "The documented service was selective debridement.",
    }
    modifier_change = {
        "field": "modifier",
        "old_value": "",
        "new_value": "59",
        "reason": "Separate site.",
    }
    rules_context = context(code="CO-4", ncci_edits=edits, other_procedure_codes=["11042"])

    without_modifier = check_draft(corrected_claim(changes=[code_change]), rules_context)
    with_modifier = check_draft(
        corrected_claim(changes=[code_change, modifier_change]), rules_context
    )

    assert check_named(without_modifier, "NCCI pair edit").outcome == "fail"
    assert check_named(with_modifier, "NCCI pair edit").outcome == "pass"


def test_ncci_pair_that_no_modifier_lifts_always_fails() -> None:
    edits = [NcciEdit(column_one_code="97597", column_two_code="11042", modifier_allowed=False)]
    changes = [
        {"field": "procedure_code", "old_value": "11043", "new_value": "97597", "reason": "Fix."},
        {"field": "modifier", "old_value": "", "new_value": "59", "reason": "Separate site."},
    ]
    rules_context = context(code="CO-4", ncci_edits=edits, other_procedure_codes=["11042"])

    result = check_draft(corrected_claim(changes=changes), rules_context)

    assert check_named(result, "NCCI pair edit").outcome == "fail"
