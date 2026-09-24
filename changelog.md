# Changelog

Track design changes and implemented behavior separately. See the [design document](docs/DESIGN.md), [feature sheet](docs/FEATURE_SHEET.md), and [current usage](README.md).

## Unreleased

### Implemented — 2026-09-24 (later design features)

- Added packaged `names.txt`, `places.txt`, and `things.txt` defaults plus separate local TXT replacement inputs in the browser, CLI, and desktop app. The browser shows the default values in editable boxes. TOML was removed from the web and desktop GUI; legacy CLI-only TOML remains, with explicit TXT files overriding matching categories.
- Renamed the bundled dictionary to `wordlist.txt` and expanded it to 10,754 normalized unique words from EFF and SCOWL sources, with a source manifest, reproducible offline build script, and separate notices.
- Changed separators to independent secure draws with repeats allowed. Added optional substitutions, off by default, and an Easy to type option that avoids introducing `0`, `1`, `I`, or `O`.
- Added browser word-selection help and optional 30/60-second visibility alongside the 10-second default.
- Validated with Python, JavaScript, Chromium browser, lint, and production-build checks.

### Design proposal — 2026-09-24

- Designed separate People, Places, and Things TXT/paste inputs as the personal-list path. The later implementation entry records the final decision to load visible TXT defaults and remove TOML from both UIs.
- Proposed renaming the bundled dictionary data file from `english.txt` to `wordlist.txt`; the later entry above records its implementation.

### Implemented — 2026-09-24

- Implemented P0 range behavior across Python and browser generation: default 16–64 characters, 128-character ceiling, `max_length` / `--max-length`, three requested dictionary words by default, bounded attempts, and explicit failures without truncation.
- Updated the browser app to put Generate first, show a read-only selectable output card with Copy, keep configuration below the main flow, and move active passwords to masked Recent passwords after ten seconds or replacement.
- Capped browser Recent passwords at the latest 10 entries, kept refresh as the page-state reset, and guarded stale timer/clipboard callbacks from restoring expired or replaced output.
- Added an active output countdown beside the character count, for example “28 characters. Moves to recent passwords in 10 seconds.”
- Added Copy controls to Recent passwords rows, ordered before Show/Hide with the masked or revealed value on the right.
- Updated tests and current docs for the implemented P0 behavior.

Validation: `poetry run pytest`, `poetry run ruff check .`, `npm test`, and `npm run test:browser`.

### Documentation — 2026-09-24

- Added the maintained feature sheet and implementation design in `docs/`, covering the three-word baseline, generation-first browser layout, Copy overlay, ten-second Recent passwords lifecycle, separator changes, optional styling/readability, and curated dictionary expansion.
- Added F11: a proposed inclusive password character range, default 16–64 and hard ceiling 128, with shared validation, bounded generation attempts, no truncation, migration rules, and failure handling.
- Recorded P0 review decisions: Recent passwords are capped at the latest 10 entries, requested word count is presented as at least three words, narrow and exact length ranges are allowed without extra discouraging warnings, Copy overlay layout remains an implementation acceptance check, and secure generation must not accept personalization inputs as randomness.
- Qualified word-combination explanations for length-conditioned generation; no output-entropy score is promised.
- Linked README, browser guide, security notes, contributing guidance, and the original proposal to the design. Corrected current browser copying/history descriptions and documented how to keep docs updated with implementation.
- Validation: Markdown links and diff checks. No application code, live configuration, dictionary, or deployment changes; no application tests run for this documentation-only change.

The Documentation entry records the design-only stage. The Implemented entries record the code, docs, and validation that followed.
