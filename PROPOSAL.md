# Proposal: passgen

## Goal

Build an open-source Python CLI and library that generates memorable passwords from either user-configured word sets or a bundled English word list.

## Tooling and packaging

- Python 3.11 or newer.
- Use `uv` for environment management, dependency installation, testing, and builds.
- Define project metadata, dependencies, CLI entry points, and tool settings in `pyproject.toml`; commit `uv.lock` for reproducible development.
- Use TOML for user configuration, parsed with Python's standard-library `tomllib`.
- Use `argparse` for the CLI and `secrets` for cryptographically secure selection.
- Use `pytest` for tests and Ruff for linting and formatting.
- Selected code license: [MIT](LICENSE), allowing permissive personal and commercial reuse with copyright and license notices preserved. Bundled EFF word-list data is separately licensed under CC BY 3.0 US; retain its attribution, license reference, and modification notices.

## Generation modes

### Configured sets: `--use-sets`

Select exactly one entry from each of these three sets:

1. People
2. Places
3. Things

All three sets must contain usable entries. Fail clearly if any set is missing or empty; do not silently switch modes. Normalize spaces within entries and preserve enough of each word to remain recognizable. Use randomized casing, optional light letter substitutions, and separators to satisfy the selected policy.

For example, `Sam`, `New York`, and `Guitar` could produce:

```text
S4m@NewYork@Guitar
```

The original two-word illustration, `S4m@N3wY0rK`, demonstrates transformations only; actual configured generation includes a thing as well.

If the result is too short, append securely selected English words rather than selecting additional configured entries. This preserves the one-entry-per-set rule and favors memorability.

### Dictionary mode: `--no-sets` (default)

Ignore configured people, places, and things. Select words independently using `secrets` from a bundled, curated English dictionary word list.

- Work offline; do not depend on an operating-system dictionary or network service.
- Use at least four words by default, even when fewer would meet the minimum length.
- Add words until the minimum length is satisfied.
- Favor familiar, readable words and light transformations over heavy leetspeak.
- Do not use quotations, common expressions, or deterministic word sequences.
- Bundle the EFF long word list under CC BY 3.0 US with separate attribution and modification notices. The original target was at least 7,776 distinct usable words; see the implementation status below for the normalization-related adjustment.

Illustrative output:

```text
Velvet-River-Lantern-Meadow-47
```

These examples are public and must not be used as real passwords.

## Password policy

- `min_length`: positive integer; default 16. This is a lower bound, not an exact length.
- `mixed_case`: when enabled, require at least one uppercase and one lowercase letter. When disabled, emit lowercase letters only.
- `numbers`: when enabled, require at least one digit. When disabled, emit no digits.
- `symbols`: when enabled, require at least one symbol from the documented alphabet `!@#$%&*+-_=?`. When disabled, emit no symbols or spaces.
- Keep dictionary words readable; use casing, random separators, and light lookalike substitutions to meet policy requirements. If a digit is required and no suitable letter exists, insert a random digit at a random position rather than appending a fixed suffix.
- Disabled character classes must also be removed from configured entries during normalization. Reject entries that become empty; do not silently discard them.
- Normalize configured entries to ASCII letters, digits, and permitted symbols, stripping whitespace. Reject unsupported characters with an actionable error rather than silently transliterating names.
- Validate every result before returning it. Reject invalid configuration or unsatisfiable policies clearly, without unbounded retry loops.

CLI options override TOML values, which override built-in defaults. Mode flags are mutually exclusive. `--no-sets` bypasses set validation, but malformed TOML and invalid shared password settings still produce errors.

## Configuration

Proposed `passgen.toml`:

```toml
[password]
min_length = 16
mixed_case = true
numbers = true
symbols = true

[sets]
people = ["Sam", "Alex"]
places = ["New York", "London"]
things = ["Guitar", "Coffee"]
```

Load an explicitly supplied `--config` path, otherwise look for `./passgen.toml`. If no default file exists, use built-in settings. An explicitly requested missing file is an error. Do not store generated passwords in configuration.

## Proposed CLI

```bash
# Default: memorable English dictionary passphrase
uv run passgen generate

# Select one entry from each configured set
uv run passgen generate --config ./passgen.toml --use-sets

# Bypass configured sets; retain shared password settings
uv run passgen generate --no-sets --min-length 24

# Explicit requirements
uv run passgen generate --no-sets --mixed-case --numbers --symbols

# Letters only
uv run passgen generate --no-sets --no-numbers --no-symbols
```

Provide `--mixed-case` / `--no-mixed-case`, `--numbers` / `--no-numbers`, and `--symbols` / `--no-symbols`. Print one password plus a newline to stdout; send errors and warnings to stderr. Return a nonzero exit status on failure. Never include generated passwords or configured personal entries in diagnostic messages.

## Architecture

```text
passgen/
├── pyproject.toml
├── uv.lock
├── README.md
├── PROPOSAL.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── examples/passgen.toml
├── src/passgen/
│   ├── __init__.py
│   ├── cli.py
│   ├── config.py
│   ├── generator.py
│   ├── policy.py
│   └── data/
│       ├── english.txt
│       └── WORDLIST_LICENSE.txt
└── tests/
```

Keep generation and validation independent of CLI parsing so applications can use the same library API. Include dictionary data and its license in both wheel and source distributions.

## Security and privacy

Use `secrets`, never `random`, for all security-relevant choices. No telemetry, network calls, password history, or password logging. Terminal output is intentional and may remain in terminal scrollback.

Personal names and familiar places are guessable, even after substitutions. Recommend dictionary mode for sensitive accounts and warn that configured mode's strength depends heavily on set sizes and attacker knowledge. Minimum length and character variety alone do not establish password strength. Do not claim entropy from cosmetic substitutions.

## Testing and acceptance criteria

- Configured mode selects exactly one entry from each of the three sets.
- Dictionary mode never draws from configured sets and emits at least four dictionary words.
- Both modes satisfy the minimum length and enabled/disabled character-class rules.
- Cover configuration precedence, normalization, missing files, empty sets, invalid types, conflicting flags, and invalid policies.
- Verify bypass mode ignores unusable sets while still validating shared settings.
- Test generation with controlled selection sources; avoid flaky assertions about random outputs or mandatory uniqueness.
- Check stdout/stderr behavior and exit codes through CLI integration tests.
- Verify offline generation from an installed wheel, including bundled data and license notices.
- Run tests and lint checks in CI on Linux, macOS, and Windows.

## Implementation milestones

1. Scaffold the `uv` project, packaging, CLI, and TOML configuration validation.
2. Implement shared policy validation and dictionary generation with a licensed word list.
3. Implement configured generation and readable transformations.
4. Add tests, CI, security guidance, contribution documentation, and release packaging.

## Implementation status

The initial CLI and library are implemented with uv packaging, TOML configuration, both modes, bundled EFF data, tests, and a cross-platform CI definition. The README describes the current interface. No independent security audit has been performed.

Implementation refinements:

- Limit minimum length to 1–4,096 to avoid accidental excessive resource use.
- Add `--words` (4–128) for dictionary mode; recommend six or more for sensitive accounts.
- Preserve all 7,776 EFF source words in the bundled file. Runtime hyphen removal and deduplication produce 7,775 uniformly selectable words, a documented deviation from the proposed 7,776 normalized-word minimum.
- Apply light optional number/symbol substitutions in both modes and one randomized uppercase position when mixed case is required. Required digits use a lookalike substitution where possible, otherwise random-position insertion.
- Include the word-list attribution and license URI with the distribution; the code is MIT licensed.

See [related-project research](docs/RELATED_PROJECTS.md) for alternatives reviewed before implementation.
