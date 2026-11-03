from denialdesk_pipeline.codes.carc import find_carc_meaning, load_carc_meanings
from denialdesk_pipeline.codes.supported_codes import SUPPORTED_DENIAL_CODES


def test_every_supported_code_has_a_meaning() -> None:
    meanings_by_code = load_carc_meanings()

    for denial_code in SUPPORTED_DENIAL_CODES:
        carc_code = denial_code.split("-")[1]
        assert carc_code in meanings_by_code


def test_known_code_returns_its_meaning() -> None:
    meanings_by_code = load_carc_meanings()

    meaning = find_carc_meaning("197", meanings_by_code)

    assert meaning is not None
    assert "authorization" in meaning.plain_english


def test_unknown_code_has_no_meaning() -> None:
    meanings_by_code = load_carc_meanings()

    assert find_carc_meaning("999", meanings_by_code) is None
