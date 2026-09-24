"""Command-line entry point."""

import argparse
import sys
from pathlib import Path

from .config import load_config, load_policy
from .generator import generate


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    # No command (or just option flags) opens the UI. Explicit generate stays headless.
    if not argv or (argv[0].startswith("-") and argv[0] not in ("-h", "--help")):
        argv.insert(0, "gui")
    parser = argparse.ArgumentParser(
        prog="passgen",
        description="Opens the GUI by default; use generate for CLI output.",
    )
    commands = parser.add_subparsers(dest="command", required=True)
    options = argparse.ArgumentParser(add_help=False)
    add_options(options)
    commands.add_parser(
        "generate", parents=[options], help="generate one password in the terminal"
    )
    commands.add_parser(
        "gui", parents=[options], help="open the password window (default)"
    )
    args = parser.parse_args(argv)
    try:
        config = load_config(args.config)
        policy = load_policy(
            config,
            {
                name: getattr(args, name)
                for name in (
                    "min_length",
                    "max_length",
                    "mixed_case",
                    "numbers",
                    "symbols",
                )
            },
        )
        if args.use_sets and args.words is not None:
            raise ValueError("--words is only available in dictionary mode")
        words = 3 if args.words is None else args.words
        if not 3 <= words <= 128:
            raise ValueError("words must be an integer between 3 and 128")
        if args.command == "gui":
            try:
                from .gui import launch
            except ImportError:
                raise ValueError(
                    "Tkinter is unavailable. Install Python's Tk support or use 'passgen generate'."
                ) from None
            return launch(
                policy, sets=config.get("sets"), use_sets=args.use_sets, words=words
            )
        password = generate(
            policy, use_sets=args.use_sets, sets=config.get("sets"), words=words
        )
    except ValueError as error:
        parser.error(str(error))
    if args.use_sets:
        print(
            "Warning: personal words are guessable; prefer dictionary mode for sensitive accounts.",
            file=sys.stderr,
        )
    print(password)
    return 0


def add_options(command):
    """Share startup overrides between the window and headless command."""
    command.add_argument("--config", type=Path)
    modes = command.add_mutually_exclusive_group()
    modes.add_argument("--use-sets", action="store_true")
    modes.add_argument("--no-sets", action="store_true")
    command.add_argument("--min-length", type=int)
    command.add_argument("--max-length", type=int)
    command.add_argument(
        "--words",
        type=int,
        default=None,
        help="dictionary word count (3–128, default 3); dictionary mode only",
    )
    for name in ("mixed-case", "numbers", "symbols"):
        command.add_argument(
            f"--{name}", action=argparse.BooleanOptionalAction, default=None
        )
