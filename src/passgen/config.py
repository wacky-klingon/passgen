"""Load TOML without exposing personal entries in error messages."""

import tomllib
from dataclasses import fields
from pathlib import Path

from .policy import Policy


def load_config(path: Path | None = None) -> dict:
    explicit = path is not None
    path = path if explicit else Path("passgen.toml")
    try:
        with path.open("rb") as stream:
            return tomllib.load(stream)
    except FileNotFoundError:
        if not explicit:
            return {}
        raise ValueError("configuration file not found") from None
    except (OSError, tomllib.TOMLDecodeError, UnicodeError):
        raise ValueError(
            "cannot read configuration: check permissions and TOML syntax"
        ) from None


def load_policy(config: dict, overrides: dict) -> Policy:
    settings = config.get("password", {})
    if not isinstance(settings, dict):
        raise ValueError("password must be a TOML table")
    names = {field.name for field in fields(Policy)}
    if settings.keys() - names:
        raise ValueError("unknown password setting")
    # Validate config even when an override would hide an invalid setting.
    Policy(**settings)
    return Policy(**(settings | {k: v for k, v in overrides.items() if v is not None}))
