"""Read private one-entry-per-line word lists without exposing entries in errors."""

from importlib.resources import files
from pathlib import Path

from .generator import normalize
from .policy import Policy

MAX_FILE_BYTES = 1024 * 1024
DEFAULT_FILES = {
    "people": "names.txt",
    "places": "places.txt",
    "things": "things.txt",
}


def parse_personal_list(text: str, name: str, policy: Policy) -> list[str]:
    entries = [line.strip() for line in text.splitlines() if line.strip()]
    if not entries:
        raise ValueError(f"{name} list needs at least one entry")
    try:
        {normalize(entry, policy) for entry in entries}
    except ValueError:
        raise ValueError(
            f"{name} list has an invalid entry for these settings"
        ) from None
    return entries


def load_personal_file(path: Path, name: str, policy: Policy) -> list[str]:
    try:
        with path.open("rb") as stream:
            data = stream.read(MAX_FILE_BYTES + 1)
        if len(data) > MAX_FILE_BYTES:
            raise ValueError(f"{name} list must be no larger than 1 MiB")
        text = data.decode("utf-8")
    except (OSError, UnicodeError):
        raise ValueError(f"cannot read {name} list as UTF-8 text") from None
    return parse_personal_list(text, name, policy)


def default_personal_lists(policy: Policy) -> dict[str, list[str]]:
    """Load the three packaged TXT lists shown by the app interfaces."""
    data = files("passgen").joinpath("data")
    return {
        category: parse_personal_list(
            data.joinpath(filename).read_text(encoding="utf-8"), category, policy
        )
        for category, filename in DEFAULT_FILES.items()
    }
