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
