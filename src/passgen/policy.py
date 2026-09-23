"""Shared password requirements and validation."""

import string
from dataclasses import dataclass

SYMBOLS = "!@#$%&*+-_=?"


@dataclass(frozen=True)
class Policy:
    min_length: int = 16
    mixed_case: bool = True
    numbers: bool = True
    symbols: bool = True

    def __post_init__(self):
        if type(self.min_length) is not int or not 1 <= self.min_length <= 4096:
            raise ValueError("min_length must be an integer between 1 and 4096")
        for name in ("mixed_case", "numbers", "symbols"):
            if type(getattr(self, name)) is not bool:
                raise ValueError(f"{name} must be a boolean")

    def accepts(self, password: str) -> bool:
        allowed = string.ascii_lowercase
        if self.mixed_case:
            allowed += string.ascii_uppercase
        if self.numbers:
            allowed += string.digits
        if self.symbols:
            allowed += SYMBOLS
        return (
            len(password) >= self.min_length
            and all(c in allowed for c in password)
            and (
                not self.mixed_case
                or (
                    any(c in string.ascii_uppercase for c in password)
                    and any(c in string.ascii_lowercase for c in password)
                )
            )
            and (not self.numbers or any(c in string.digits for c in password))
            and (not self.symbols or any(c in SYMBOLS for c in password))
        )
