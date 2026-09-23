# Contributing

Use Python 3.11+ and uv:

```bash
uv sync --dev --locked
uv run pytest
uv run ruff check --config pyproject.toml src tests
uv run ruff format --config pyproject.toml --check src tests
uv build
```

Add tests for behavioral changes. Keep all security-relevant choices on `secrets`; do not add password logging or network dependencies to generation. Use deterministic selection stubs in tests rather than assuming random outputs will differ.

Commit `uv.lock` when dependencies change. Preserve data licenses and attribution when changing the dictionary. Never submit actual passwords or personal configuration.

## Licensing contributions

Submit code contributions under the project's [MIT License](LICENSE). Only contribute material you have the right to license, and preserve applicable third-party notices.

The bundled EFF word list is separately licensed under CC BY 3.0 US. Keep its [attribution and license reference](src/passgen/data/WORDLIST_LICENSE.txt), and document any changes to the data. Do not relabel third-party word-list data as MIT licensed.
