"""CARC code meanings: a data file plus a loader.

Loading reads the data file at the edge. Looking a code up is pure. Whether a
code is supported for drafting lives in supported_codes.py, not here.
"""

from pathlib import Path

from pydantic import BaseModel, TypeAdapter

CARC_CODES_PATH = Path(__file__).with_name("carc_codes.json")


class CarcCodeMeaning(BaseModel):
    carc_code: str
    official_text: str
    plain_english: str


def load_carc_meanings(path: Path = CARC_CODES_PATH) -> dict[str, CarcCodeMeaning]:
    meanings_list = TypeAdapter(list[CarcCodeMeaning]).validate_json(path.read_bytes())
    meanings_by_code: dict[str, CarcCodeMeaning] = {}
    for meaning in meanings_list:
        meanings_by_code[meaning.carc_code] = meaning
    return meanings_by_code


def find_carc_meaning(
    carc_code: str, meanings_by_code: dict[str, CarcCodeMeaning]
) -> CarcCodeMeaning | None:
    return meanings_by_code.get(carc_code)
