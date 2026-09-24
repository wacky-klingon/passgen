# Contributing

Use Python 3.11+ and uv:

```bash
uv sync --dev --locked
uv run pytest
uv run ruff check --config pyproject.toml src tests
uv run ruff format --config pyproject.toml --check src tests
uv build
```

Add tests for behavioral changes. Keep all security-relevant choices on Python `secrets` or the browser Web Crypto chooser; do not add password logging or network dependencies to generation. Use deterministic selection stubs in tests rather than assuming random outputs will differ.

Commit `uv.lock` when dependencies change. Preserve data licenses and attribution when changing the dictionary. Never submit actual passwords or personal configuration.

## Design and documentation

Use [docs/DESIGN.md](docs/DESIGN.md) for the implementation contracts and [docs/FEATURE_SHEET.md](docs/FEATURE_SHEET.md) for scope. Planned features are not implemented simply because these documents exist.

For each relevant implementation change:

- Update [README.md](README.md) for supported settings, defaults, CLI/API usage, and migration notes.
- Update [web/README.md](web/README.md) for actual browser controls, copy/expiry/history behavior, limits, and tested browsers.
- Update [SECURITY.md](SECURITY.md) when generation, bounds, distribution claims, or retention change.
- Update `examples/passgen.toml` only when the parser supports the added keys; keep current examples runnable.
- Add an Unreleased entry to [changelog.md](changelog.md) describing implemented behavior, compatibility effects, and verification. Keep design-only entries distinct.
- Keep the design and feature sheet aligned with decisions and actual progress. Retain the original proposal as historical context.

Documentation-only changes require checking Markdown links and `git diff --check`. Do not run application generation merely to validate prose. For implementation changes, run the focused checks in the design and existing project suites appropriate to the affected surfaces.

## Licensing contributions

Submit code contributions under the project's [MIT License](LICENSE). Only contribute material you have the right to license, and preserve applicable third-party notices.

The bundled EFF word list is separately licensed under CC BY 3.0 US. Keep its [attribution and license reference](src/passgen/data/WORDLIST_LICENSE.txt), and document any changes to the data. Do not relabel third-party word-list data as MIT licensed.
