"""Offline generation using OS-backed cryptographic randomness."""

import secrets
import string
from functools import lru_cache
from importlib.resources import files

from .policy import SYMBOLS, Policy

SET_NAMES = ("people", "places", "things")
DEFAULT_WORDS = 3
MAX_ATTEMPTS = 128
MAX_PARTS = 128
LOOKALIKES = {
    "a": "4@",
    "b": "8",
    "e": "3",
    "g": "9",
    "i": "1!",
    "l": "1",
    "o": "0",
    "s": "5$",
    "t": "7+",
    "z": "2",
}


def replacements(letter: str, policy: Policy) -> str:
    return "".join(
        c
        for c in LOOKALIKES.get(letter, "")
        if (policy.numbers and c in string.digits) or (policy.symbols and c in SYMBOLS)
    )


def stylize(word: str, policy: Policy) -> str:
    """Optionally replace one letter per word, preserving readability."""
    indices = [i for i, c in enumerate(word) if replacements(c, policy)]
    if not indices or not secrets.randbelow(2):
        return word
    i = secrets.choice(indices)
    return word[:i] + secrets.choice(replacements(word[i], policy)) + word[i + 1 :]


def ensure_digit(parts: list[str], policy: Policy) -> None:
    """Prefer a lookalike; otherwise insert a digit at a random word position."""
    if not policy.numbers or any(c in string.digits for part in parts for c in part):
        return
    candidates = [
        (i, j)
        for i, part in enumerate(parts)
        for j, c in enumerate(part)
        if any(r in string.digits for r in LOOKALIKES.get(c, ""))
    ]
    if candidates:
        i, j = secrets.choice(candidates)
        digit = secrets.choice(
            "".join(c for c in LOOKALIKES[parts[i][j]] if c in string.digits)
        )
        parts[i] = parts[i][:j] + digit + parts[i][j + 1 :]
    else:
        i, j = secrets.choice(
            [(i, j) for i, part in enumerate(parts) for j in range(len(part) + 1)]
        )
        parts[i] = parts[i][:j] + secrets.choice(string.digits) + parts[i][j:]


def separator_source(enabled: bool):
    remaining_symbols = []
    previous_separator = ""

    def next_separator():
        nonlocal previous_separator
        if not enabled:
            return ""
        if not remaining_symbols:
            remaining_symbols.extend(SYMBOLS)
        candidates = [s for s in remaining_symbols if s != previous_separator]
        separator = secrets.choice(candidates)
        remaining_symbols.remove(separator)
        previous_separator = separator
        return separator

    return next_separator


def join_parts(parts: list[str], policy: Policy) -> str:
    next_separator = separator_source(policy.symbols)
    password = parts[0]
    for part in parts[1:]:
        password += next_separator() + part
    return password


def joined_length(parts: list[str], policy: Policy) -> int:
    if not parts:
        return 0
    return sum(len(part) for part in parts) + (len(parts) - 1 if policy.symbols else 0)


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


def lower_bound_length(*, use_sets: bool, sets: object, policy: Policy, words: int) -> int:
    separator_length = 1 if policy.symbols else 0
    if use_sets:
        normalized_sets = configured_sets(sets, policy)
        word_lengths = [min(len(entry) for entry in entries) for entries in normalized_sets]
    else:
        shortest = min(len(word) for word in dictionary())
        word_lengths = [shortest] * words
    return sum(word_lengths) + separator_length * (len(word_lengths) - 1)


def generate(
    policy: Policy | None = None,
    *,
    use_sets: bool = False,
    sets: object = None,
    words: int = DEFAULT_WORDS,
) -> str:
    """Select one entry per set, or at least three dictionary words.

    Additional dictionary words satisfy length and case requirements without
    reselecting configured entries. Bounded retries discard over-limit candidates.
    """
    policy = policy or Policy()
    if type(words) is not int or not 3 <= words <= 128:
        raise ValueError("words must be an integer between 3 and 128")
    if lower_bound_length(use_sets=use_sets, sets=sets, policy=policy, words=words) > policy.max_length:
        raise ValueError("word count and character range cannot fit")
    normalized_sets = configured_sets(sets, policy) if use_sets else None
    words_source = dictionary()

    for _ in range(MAX_ATTEMPTS):
        if use_sets:
            parts = [secrets.choice(entries) for entries in normalized_sets]
        else:
            parts = [secrets.choice(words_source) for _ in range(words)]

        parts = [stylize(part, policy) for part in parts]
        ensure_digit(parts, policy)
        if joined_length(parts, policy) > policy.max_length:
            continue

        while joined_length(parts, policy) < policy.min_length or (
            policy.mixed_case
            and sum(c in string.ascii_lowercase for part in parts for c in part) < 2
        ):
            if len(parts) >= MAX_PARTS:
                break
            candidate_parts = parts + [stylize(secrets.choice(words_source), policy)]
            if joined_length(candidate_parts, policy) > policy.max_length:
                parts = []
                break
            parts = candidate_parts
        if not parts:
            continue

        password = join_parts(parts, policy)
        if policy.mixed_case:
            # Capitalize a random letter, keeping all other letters readable/lowercase.
            indices = [i for i, c in enumerate(password) if c in string.ascii_lowercase]
            if not indices:
                continue
            i = secrets.choice(indices)
            password = password[:i] + password[i].upper() + password[i + 1 :]
        if policy.accepts(password):
            return password
    raise ValueError(
        "could not generate a password within these limits; increase max_length, "
        "lower min_length, or adjust the word count"
    )
