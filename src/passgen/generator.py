"""Offline generation using OS-backed cryptographic randomness."""

import secrets
import string
from functools import lru_cache
from importlib.resources import files

from .policy import SYMBOLS, Policy

SET_NAMES = ("people", "places", "things")


@lru_cache(maxsize=1)
def dictionary() -> tuple[str, ...]:
    text = files("passgen").joinpath("data/english.txt").read_text(encoding="utf-8")
    # Remove four hyphens and deduplicate the resulting words before selection.
    words = tuple(dict.fromkeys(word.replace("-", "") for word in text.splitlines()))
    if not words or any(not w.isascii() or not w.isalpha() for w in words):
        raise ValueError("bundled dictionary is invalid")
    return words


def normalize(entry: str, policy: Policy) -> str:
    allowed = string.ascii_letters + string.digits + SYMBOLS
    if any(not c.isspace() and c not in allowed for c in entry):
        raise ValueError(
            "set entries must use ASCII letters, digits, permitted symbols or whitespace"
        )
    result = "".join(
        c.lower()
        for c in entry
        if not c.isspace()
        and (policy.numbers or c not in string.digits)
        and (policy.symbols or c not in SYMBOLS)
    )
    if not result:
        raise ValueError("a set entry is empty after applying the password policy")
    return result


def configured_sets(sets: object, policy: Policy) -> list[tuple[str, ...]]:
    if not isinstance(sets, dict):
        raise ValueError("configured mode requires a sets table")
    result = []
    for name in SET_NAMES:
        entries = sets.get(name)
        if not isinstance(entries, list) or not entries:
            raise ValueError(f"sets.{name} must be a nonempty array of strings")
        if any(not isinstance(entry, str) for entry in entries):
            raise ValueError(f"sets.{name} must contain only strings")
        result.append(tuple(dict.fromkeys(normalize(e, policy) for e in entries)))
    return result


def generate(
    policy: Policy | None = None,
    *,
    use_sets: bool = False,
    sets: object = None,
    words: int = 4,
) -> str:
    """Select one entry per set, or at least four dictionary words.

    Additional dictionary words satisfy length and case requirements without
    reselecting configured entries. There is no generation retry loop.
    """
    policy = policy or Policy()
    if type(words) is not int or not 4 <= words <= 128:
        raise ValueError("words must be an integer between 4 and 128")
    if use_sets:
        parts = [secrets.choice(entries) for entries in configured_sets(sets, policy)]
        # Light, optional substitutions, at most one per configured entry.
        if policy.numbers:
            substitutions = {"a": "4", "e": "3", "i": "1", "o": "0", "s": "5"}
            for i, part in enumerate(parts):
                indices = [j for j, c in enumerate(part) if c in substitutions]
                if indices and secrets.randbelow(2):
                    j = secrets.choice(indices)
                    parts[i] = part[:j] + substitutions[part[j]] + part[j + 1 :]
    else:
        parts = [secrets.choice(dictionary()) for _ in range(words)]

    separator = secrets.choice(SYMBOLS) if policy.symbols else ""
    suffix = (
        "".join(secrets.choice(string.digits) for _ in range(2))
        if policy.numbers
        else ""
    )
    password = separator.join(parts) + (separator + suffix if suffix else "")
    while len(password) < policy.min_length or (
        policy.mixed_case and sum(c in string.ascii_lowercase for c in password) < 2
    ):
        password += separator + secrets.choice(dictionary())

    if policy.mixed_case:
        # Capitalize a random letter, keeping all other letters readable/lowercase.
        indices = [i for i, c in enumerate(password) if c in string.ascii_lowercase]
        i = secrets.choice(indices)
        password = password[:i] + password[i].upper() + password[i + 1 :]
    if not policy.accepts(password):
        raise ValueError("generated password failed policy validation")
    return password
