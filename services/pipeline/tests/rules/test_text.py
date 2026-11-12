from denialdesk_pipeline.rules.text import leftover_placeholders, quoted_passages


def test_finds_straight_and_curly_quotes() -> None:
    text = 'The policy says "paid in full" and also “no limit applies” here.'

    assert quoted_passages(text) == ["paid in full", "no limit applies"]


def test_unclosed_quote_is_not_a_passage() -> None:
    assert quoted_passages('It says "paid in full') == []


def test_finds_each_kind_of_placeholder() -> None:
    assert leftover_placeholders("Dear [NAME], amount TBD.") == ["[NAME]", "TBD"]
    assert leftover_placeholders("Hello {{ patient }}") == ["{{"]
    assert leftover_placeholders("Member XXX, see above.") == ["XXX"]


def test_ordinary_brackets_and_words_are_not_placeholders() -> None:
    assert leftover_placeholders("See section [4.2] of the policy for Xxxtra care.") == []
