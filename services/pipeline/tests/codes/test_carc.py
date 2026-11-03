from denialdesk_pipeline.codes.carc import find_carc_meaning, load_carc_meanings

FIRST_SUPPORTED_CARC_CODES = {"4", "16", "29", "50", "197"}


def test_all_first_supported_codes_are_in_the_data_file() -> None:
    meanings_by_code = load_carc_meanings()

    for carc_code in FIRST_SUPPORTED_CARC_CODES:
        assert meanings_by_code[carc_code].supported


def test_known_code_returns_its_meaning() -> None:
    meanings_by_code = load_carc_meanings()

    meaning = find_carc_meaning("197", meanings_by_code)

    assert "authorization" in meaning.plain_english


def test_unknown_code_is_not_supported() -> None:
    meanings_by_code = load_carc_meanings()

    meaning = find_carc_meaning("999", meanings_by_code)

    assert meaning.carc_code == "999"
    assert not meaning.supported
