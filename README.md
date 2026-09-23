# passgen

An offline Python CLI and library for memorable passwords, managed with **uv** and configured with **TOML**.

Status: initial implementation, with automated tests; not independently security-audited.

## Quick start

Requires Python 3.11+ and [uv](https://docs.astral.sh/uv/). From this repository:

```bash
uv sync

# Default: at least four English dictionary words
uv run passgen generate

# Recommended for sensitive use: six or more words
uv run passgen generate --no-sets --words 6

# One entry from each configured set: people, places, things
uv run passgen generate --config examples/passgen.toml --use-sets

# Bypass personal sets while retaining shared password settings
uv run passgen generate --no-sets --min-length 24

# Override requirements
uv run passgen generate --mixed-case --numbers --symbols
uv run passgen generate --no-mixed-case --no-numbers --no-symbols
```

Installation needs dependencies/build tooling; password generation itself makes no network calls. Outputs are random; illustrative examples in the proposal are not fixed templates or passwords to reuse.

## Configuration

Create `passgen.toml` in your working directory or select a file with `--config`:

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

CLI flags override valid configuration values, which override defaults. No default file is required for dictionary mode. Malformed TOML and invalid shared settings are errors even in bypass mode.

- `--use-sets` and `--no-sets` are mutually exclusive; dictionary mode is the default.
- Configured mode selects exactly one entry from each set. Missing/empty sets are errors.
- Spaces are removed from configured entries. Unsupported non-ASCII characters are rejected. Disabled digits/symbols are removed; entries that become empty are rejected.
- Minimum length is a floor, from 1 to 4,096. Additional random dictionary words fill short results.
- Enabled options guarantee both letter cases, at least one digit, and/or at least one symbol. Disabled options produce lowercase letters only, no digits, and/or no symbols, respectively.
- Symbol alphabet: `!@#$%&*+-_=?`.
- Dictionary mode uses 4–128 words (`--words`), adding more if needed for length. Configured mode does not accept a custom word count.
- Print one password to stdout; errors and configured-mode security warnings go to stderr.

## Python API

```python
from passgen import Policy, generate

password = generate(Policy(min_length=24), words=6)
password = generate(
    Policy(min_length=20),
    use_sets=True,
    sets={"people": ["Sam"], "places": ["New York"], "things": ["Guitar"]},
)
```

## Security

Random selections use Python's `secrets` module. There is no telemetry, password history, or password logging. Output can remain in terminal scrollback; store passwords in a password manager.

Personal names and places remain guessable despite substitutions. Prefer dictionary mode with **six or more words** for sensitive accounts. Four words are the agreed minimum, not a universal strength guarantee. Length and character variety alone do not establish security.

The bundled EFF long list contains 7,776 source words. Removing hyphens and deduplicating at runtime yields **7,775** uniformly selectable words. Casing and light substitutions are not presented as meaningful strength guarantees.

See [SECURITY.md](SECURITY.md) for limitations.

## Development

```bash
uv sync --dev --locked
uv run pytest
uv run ruff check --config pyproject.toml src tests
uv run ruff format --config pyproject.toml --check src tests
uv build
```

- [Proposal](PROPOSAL.md)
- [Related GitHub projects](docs/RELATED_PROJECTS.md)
- [Contributing](CONTRIBUTING.md)

## License

Code: [MIT](LICENSE). EFF word-list data: [CC BY 3.0 US, with attribution](src/passgen/data/WORDLIST_LICENSE.txt).
