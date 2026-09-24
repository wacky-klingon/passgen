"""Separator draws are independent and may repeat."""

from passgen import Policy, generate
from passgen.generator import separator_source
from passgen.policy import SYMBOLS


def test_independent_separators_can_repeat(monkeypatch):
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    next_separator = separator_source(True)
    assert [next_separator() for _ in range(4)] == [SYMBOLS[0]] * 4
    assert separator_source(False)() == ""


def test_generation_uses_repeated_separators(monkeypatch):
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    password = generate(
        Policy(1, False, False, True),
        use_sets=True,
        sets={"people": ["Sam"], "places": ["York"], "things": ["Book"]},
    )
    assert password == "sam!york!book"
