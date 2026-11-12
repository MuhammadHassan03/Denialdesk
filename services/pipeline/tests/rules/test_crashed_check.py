import pytest

from denialdesk_pipeline.draft.models import Draft
from denialdesk_pipeline.rules import run_checks
from denialdesk_pipeline.rules.models import RuleCheck, RulesContext
from tests.rules.drafts import appeal, context


def broken_check(draft: Draft, rules_context: RulesContext) -> RuleCheck:
    raise RuntimeError("bug in a check")


def test_crashed_check_counts_as_a_fail(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(run_checks, "SHARED_CHECKS", [("Deadline", broken_check)])

    result = run_checks.check_draft(appeal(), context())

    crashed_checks = [check for check in result.checks if check.crashed]
    assert result.overall == "fail"
    assert len(crashed_checks) == 1
    assert crashed_checks[0].name == "Deadline"
    assert crashed_checks[0].reason == "This check couldn't run."
