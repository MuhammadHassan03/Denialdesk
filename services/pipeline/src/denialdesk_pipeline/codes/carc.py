"""CARC code meanings: a data file plus a loader.

Loading reads the data file once at the edge. Looking a code up is pure.
"""

from pathlib import Path

from pydantic import BaseModel, TypeAdapter

CARC_CODES_PATH = Path(__file__).with_name("carc_codes.json")

UNKNOWN_CODE_MEANING = "We don't have a plain-English meaning for this code yet."


class CarcCodeMeaning(BaseModel):
    carc_code: str
    official_text: str
    plain_english: str
    supported: bool


def load_carc_meanings(path: Path = CARC_CODES_PATH) -> dict[str, CarcCodeMeaning]:
    meanings_list = TypeAdapter(list[CarcCodeMeaning]).validate_json(path.read_bytes())
    meanings_by_code: dict[str, CarcCodeMeaning] = {}
    for meaning in meanings_list:
        meanings_by_code[meaning.carc_code] = meaning
    return meanings_by_code


def find_carc_meaning(
    carc_code: str, meanings_by_code: dict[str, CarcCodeMeaning]
) -> CarcCodeMeaning:
    known_meaning = meanings_by_code.get(carc_code)
    if known_meaning is not None:
        return known_meaning
    return CarcCodeMeaning(
        carc_code=carc_code,
        official_text=UNKNOWN_CODE_MEANING,
        plain_english=UNKNOWN_CODE_MEANING,
        supported=False,
    )
