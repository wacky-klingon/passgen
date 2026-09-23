"""Command-line entry point."""

import argparse
import sys
from pathlib import Path

from .config import load_config, load_policy
from .generator import generate


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="passgen")
    commands = parser.add_subparsers(dest="command", required=True)
    command = commands.add_parser("generate", help="generate one memorable password")
    command.add_argument("--config", type=Path)
    modes = command.add_mutually_exclusive_group()
    modes.add_argument("--use-sets", action="store_true")
    modes.add_argument("--no-sets", action="store_true")
    command.add_argument("--min-length", type=int)
    command.add_argument(
        "--words",
        type=int,
        default=4,
        help="dictionary word count (4–128, default 4); dictionary mode only",
    )
    for name in ("mixed-case", "numbers", "symbols"):
        command.add_argument(
            f"--{name}", action=argparse.BooleanOptionalAction, default=None
        )
    args = parser.parse_args(argv)
    try:
        config = load_config(args.config)
        policy = load_policy(
            config,
            {
                name: getattr(args, name)
                for name in ("min_length", "mixed_case", "numbers", "symbols")
            },
        )
        if args.use_sets and args.words != 4:
            raise ValueError("--words is only available in dictionary mode")
        password = generate(
            policy, use_sets=args.use_sets, sets=config.get("sets"), words=args.words
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
