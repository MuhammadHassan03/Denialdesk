"""Small text helpers for the rules check: quoted passages and leftover placeholders. Pure."""

OPENING_QUOTES = frozenset({'"', "“"})
CLOSING_QUOTES = frozenset({'"', "”"})
PLACEHOLDER_WORDS = ("TBD", "XXX")
TEMPLATE_OPENER = "{{"


def collapse_whitespace(text: str) -> str:
    return " ".join(text.split())


def quoted_passages(text: str) -> list[str]:
    passages: list[str] = []
    current: list[str] | None = None
    for character in text:
        if current is None:
            if character in OPENING_QUOTES:
                current = []
            continue
        if character in CLOSING_QUOTES:
            passages.append("".join(current))
            current = None
            continue
        current.append(character)
    return passages


def _is_placeholder_label(label: str) -> bool:
    if label == "":
        return False
    has_letter = False
    for character in label:
        if character.isalpha():
            has_letter = True
            if not character.isupper():
                return False
        elif character not in " _-":
            return False
    return has_letter


def _bracket_placeholders(text: str) -> list[str]:
    found: list[str] = []
    rest = text
    while "[" in rest:
        after_open = rest.split("[", 1)[1]
        if "]" not in after_open:
            break
        label, rest = after_open.split("]", 1)
        if _is_placeholder_label(label):
            found.append(f"[{label}]")
    return found


def _words(text: str) -> list[str]:
    words: list[str] = []
    for raw_word in text.split():
        words.append(raw_word.strip(".,;:!?()\"'"))
    return words


def leftover_placeholders(text: str) -> list[str]:
    found = _bracket_placeholders(text)
    if TEMPLATE_OPENER in text:
        found.append(TEMPLATE_OPENER)
    words = _words(text)
    for placeholder_word in PLACEHOLDER_WORDS:
        if placeholder_word in words:
            found.append(placeholder_word)
    return found
