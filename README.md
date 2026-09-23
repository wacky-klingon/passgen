# passgen

An offline Python desktop app, CLI, and library for memorable passwords, managed with **uv** and configured with **TOML**.

Status: initial implementation, with automated tests; not independently security-audited.

## Quick start

Requires Python 3.11+ and [uv](https://docs.astral.sh/uv/). From this repository:

```bash
uv sync

# Default entry point: open the desktop window
uv run passgen

# Open with configured sets and startup overrides
uv run passgen --config examples/passgen.toml --use-sets --no-numbers

# CLI: at least four English dictionary words
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

## Desktop UI

`uv run passgen` (or `uv run python -m passgen`) opens the Tkinter window. `passgen gui` also works. The three toggles enable/disable mixed case, numbers, and symbols for the next password. Choose English words or configured sets and adjust minimum length; word count is disabled in configured mode.

**Click the read-only password area to generate a new password and copy it to the clipboard.** With the area focused, Enter or Space does the same. Invalid settings are shown in the status line without replacing the previous password or clipboard. Clipboard failures are reported rather than claiming success. No password is generated or copied merely by opening the window or changing a setting.

The same startup flags accepted by `generate` initialize the UI. Changes in the window are temporary: there is no config editor and nothing is written to TOML. `--words` is rejected with `--use-sets`.

Tkinter must be available in the Python interpreter used by uv. If it is missing, install your platform's matching Python Tk support (for example `python3-tk` for many Linux system Pythons) and select that interpreter with uv. Without a graphical display, use `passgen generate`; CLI operation does not import Tkinter.

Passwords remain visible until replaced or the window closes. Clipboard history may retain copied values; clipboard persistence after closing the app depends on your operating system.

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
- Symbol alphabet: `!@#$%&*+-_=?`. Each join uses a randomly selected separator without reuse until the alphabet is exhausted. Longer passwords start a fresh pool, never repeating the previous separator. This applies to word joins and length-padding words. Symbols inside words (existing or substituted) are not separators and may repeat.
- Both modes use light, randomized lookalike substitutions: `a → 4/@`, `b → 8`, `e → 3`, `g → 9`, `i → 1/!`, `l → 1`, `o → 0`, `s → 5/$`, `t → 7/+`, `z → 2`. Only enabled character types are used. There is no fixed numeric suffix: if a digit is still required, replace a random suitable letter or, if none exists, insert a digit at a random position. Existing digits already satisfy the requirement.
- Dictionary mode uses 4–128 words (`--words`), adding more if needed for length. Configured mode does not accept a custom word count.
- CLI mode prints one password to stdout; errors and configured-mode security warnings go to stderr. The GUI displays these locally without printing passwords.

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

The project code is licensed under the [MIT License](LICENSE). You may use, modify, and redistribute it, including commercially, provided you preserve the copyright and license notice. Publishing your modifications is not required. The software is provided without warranty; see the license for full terms.

MIT was chosen for its simplicity and permissive reuse terms.

The bundled EFF word-list data is **separately licensed under CC BY 3.0 US**, not MIT. Redistributing it requires preserving EFF attribution, the license reference, and notices of modifications. See [word-list attribution and licensing](src/passgen/data/WORDLIST_LICENSE.txt).
