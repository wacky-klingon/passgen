# passgen

An offline Python desktop app, CLI, and library for memorable passwords, managed with **uv**. Personal lists use three plain-text files. Legacy TOML configuration remains available to the CLI only.

Status: initial implementation, with automated tests; not independently security-audited.

The [design document](docs/DESIGN.md) and [feature sheet](docs/FEATURE_SHEET.md) describe the implemented design. See the [0.1.0 release notes](docs/releases/0.1.0.md) and [changelog](changelog.md) for release history.

## Browser version (initial implementation)

A static HTML/JavaScript version now lives in [`web/`](web/README.md). Run it locally with Node.js 22.12+:

```bash
cd web
npm ci
npm run dev
```

It starts with visible default Names, Places, and Things entries. Each list can be edited, pasted, or replaced with a local TXT file; there is no TOML control. Generate and Copy are separate. Active passwords show a character count and countdown, then move to masked Recent passwords after the selected 10, 30, or 60 seconds or when replaced. The latest 10 recent entries offer Copy and Show/Hide; refresh clears passwords and restores the default lists. See the [browser documentation](web/README.md) for testing and GitHub Pages deployment, or open the [browser app](https://wacky-klingon.github.io/passgen/).

The browser exposes two main modes: **Wordlist** and **Name + Place + Thing**. Wordlist remains the default. Editing list text marks that category as unapplied until you use the matching Apply button, and editing a list does not switch the selected mode.

## Quick start

Requires Python 3.11+ and [uv](https://docs.astral.sh/uv/). From this repository:

```bash
uv sync

# Default entry point: open the desktop window
uv run passgen

# Open the GUI with its default TXT lists and startup overrides
uv run passgen --use-sets --no-numbers

# CLI: at least three English dictionary words
uv run passgen generate

# Recommended for sensitive use: six or more words
uv run passgen generate --no-sets --words 6

# One entry from each configured set: people, places, things
uv run passgen generate --config examples/passgen.toml --use-sets

# Or provide one-entry-per-line TXT files
uv run passgen generate --use-sets --people-file examples/names.txt --places-file examples/places.txt --things-file examples/things.txt

# Bypass personal sets while retaining shared password settings
uv run passgen generate --no-sets --min-length 24 --max-length 64

# Override requirements
uv run passgen generate --mixed-case --numbers --symbols
uv run passgen generate --no-mixed-case --no-numbers --no-symbols
```

Installation needs dependencies/build tooling; password generation itself makes no network calls. Outputs are random; illustrative examples in the proposal are not fixed templates or passwords to reuse.

## Desktop UI

`uv run passgen` (or `uv run python -m passgen`) opens the Tkinter window. `passgen gui` also works. The default `names.txt`, `places.txt`, and `things.txt` lists are loaded automatically; their filenames and counts appear in the window. Replace any category with its TXT button. Choose English words or configured sets and adjust minimum and maximum length; word count is disabled in configured mode. The GUI does not read TOML configuration.

**Click the read-only password area to generate a new password and copy it to the clipboard.** With the area focused, Enter or Space does the same. Invalid settings are shown in the status line without replacing the previous password or clipboard. Clipboard failures are reported rather than claiming success. No password is generated or copied merely by opening the window or changing a setting.

The same startup flags accepted by `generate` initialize the UI. The three **Load TXT** buttons replace one personal category at a time; changes in the window are temporary. `--words` is rejected with `--use-sets`.

Tkinter must be available in the Python interpreter used by uv. If it is missing, install your platform's matching Python Tk support (for example `python3-tk` for many Linux system Pythons) and select that interpreter with uv. Without a graphical display, use `passgen generate`; CLI operation does not import Tkinter.

Passwords remain visible until replaced or the window closes. Clipboard history may retain copied values; clipboard persistence after closing the app depends on your operating system.

## CLI configuration

Create `passgen.toml` in your working directory or select a file with `--config`:

```toml
[password]
min_length = 16
max_length = 64
mixed_case = true
numbers = true
symbols = true
substitutions = false
easy_to_type = false

[sets]
people = ["Sam", "Alex"]
places = ["New York", "London"]
things = ["Guitar", "Coffee"]
```

This TOML path is retained for CLI compatibility. CLI flags override valid configuration values, which override defaults. No default file is required for dictionary mode. Malformed TOML and invalid shared settings are errors even in bypass mode. The web and desktop interfaces use TXT lists and do not expose or load TOML.

Each personal TXT file uses UTF-8 with one entry per line. Blank lines are ignored. `--people-file`, `--places-file`, and `--things-file` override the matching legacy CLI TOML category; all three categories need a usable entry for configured mode. The browser also accepts pasted lines and starts with the packaged defaults. Lists stay local and are never written back to files.

- `--use-sets` and `--no-sets` are mutually exclusive; dictionary mode is the default.
- Configured mode selects exactly one entry from each set. Missing/empty sets are errors.
- Spaces are removed from configured entries. Unsupported non-ASCII characters are rejected. Disabled digits/symbols are removed; entries that become empty are rejected.
- Minimum and maximum length define an inclusive character range from 1 to 128, with defaults of 16–64. Additional random dictionary words fill short results when they can still fit. Generation fails clearly rather than truncating, dropping requested words, or silently relaxing settings.
- Enabled options guarantee both letter cases, at least one digit, and/or at least one symbol. Disabled options produce lowercase letters only, no digits, and/or no symbols, respectively.
- Symbol alphabet: `!@#$%&*+-_=?`. Each word gap draws independently; separators may repeat.
- Lookalike substitutions are optional and off by default. Enable them with `--substitutions` or the UI control. When disabled, a required digit is inserted at a random word position. There is no fixed numeric suffix. The **Easy to type** option (`--easy-to-type`) avoids introducing `0`, `1`, uppercase `I`, and uppercase `O`; characters already present in personal entries remain.
- Dictionary mode uses at least 3–128 requested words (`--words`), adding more whole words if needed for length. Configured mode does not accept a custom word count.
- CLI mode prints one password to stdout; errors and configured-mode security warnings go to stderr. The GUI displays these locally without printing passwords.

## Python API

```python
from passgen import Policy, generate

password = generate(Policy(min_length=24, max_length=64), words=6)
password = generate(
    Policy(min_length=20, max_length=64),
    use_sets=True,
    sets={"people": ["Sam"], "places": ["New York"], "things": ["Guitar"]},
)
```

## Security

Random selections use Python's `secrets` module or browser Web Crypto. There is no telemetry or password logging. The browser retains the latest 10 masked recent passwords in page memory until refresh; Python does not keep a password-history list. Output can remain in terminal scrollback; store passwords in a password manager.

Personal names and places remain guessable despite substitutions. Prefer dictionary mode with **six or more words** for sensitive accounts. Three words are the current implementation's usability default, not a universal strength guarantee. Length and character variety alone do not establish security.

The bundled [wordlist.txt](src/passgen/data/wordlist.txt) combines EFF and SCOWL sources into **10,754** uniformly selectable words after normalization and deduplication. See the [source manifest](src/passgen/data/WORDLIST_MANIFEST.json) and [licensing notice](src/passgen/data/WORDLIST_LICENSE.txt). Casing and substitutions are not presented as meaningful strength guarantees.

See [SECURITY.md](SECURITY.md) for limitations.

## Development

```bash
uv sync --dev --locked
uv run pytest
uv run ruff check --config pyproject.toml src tests
uv run ruff format --config pyproject.toml --check src tests
uv build
```

- [Design and acceptance criteria](docs/DESIGN.md)
- [Feature sheet](docs/FEATURE_SHEET.md)
- [0.1.0 release notes](docs/releases/0.1.0.md)
- [Changelog](changelog.md)
- [Original proposal](PROPOSAL.md)
- [Related GitHub projects](docs/RELATED_PROJECTS.md)
- [Contributing](CONTRIBUTING.md)

Update this README, the browser guide, security guidance, examples, and changelog alongside the implementation they describe. Keep proposed behavior labeled as planned until supported; see the [documentation maintenance contract](docs/DESIGN.md#documentation-maintenance).

## License

The project code is licensed under the [MIT License](LICENSE). You may use, modify, and redistribute it, including commercially, provided you preserve the copyright and license notice. Publishing your modifications is not required. The software is provided without warranty; see the license for full terms.

MIT was chosen for its simplicity and permissive reuse terms.

The bundled word-list data has **separate EFF and SCOWL terms**, not the code's MIT license. Redistributing it requires preserving the [word-list attribution and licensing](src/passgen/data/WORDLIST_LICENSE.txt) and [SCOWL notice](src/passgen/data/SCOWL_COPYRIGHT.txt).
