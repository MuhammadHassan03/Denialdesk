from pathlib import Path

SYNTHETIC_835_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "synthetic" / "835"


def read_835_fixture(file_name: str) -> str:
    return (SYNTHETIC_835_DIR / file_name).read_text()
