import pytest

from passgen import Policy, generate
from passgen.generator import ensure_digit, stylize


@pytest.mark.parametrize(
    "letter,digit", [("a", "4"), ("e", "3"), ("i", "1"), ("o", "0"), ("s", "5")]
)
def test_numeric_lookalikes(monkeypatch, letter, digit):
    monkeypatch.setattr("passgen.generator.secrets.randbelow", lambda n: 1)
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    assert stylize(letter, Policy(symbols=False)) == digit


@pytest.mark.parametrize(
    "letter,symbol", [("a", "@"), ("i", "!"), ("s", "$"), ("t", "+")]
)
def test_symbol_lookalikes(monkeypatch, letter, symbol):
    monkeypatch.setattr("passgen.generator.secrets.randbelow", lambda n: 1)
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    assert stylize(letter, Policy(numbers=False)) == symbol


def test_disabled_classes(monkeypatch):
    monkeypatch.setattr("passgen.generator.secrets.randbelow", lambda n: 1)
    assert stylize("aeiost", Policy(numbers=False, symbols=False)) == "aeiost"


def test_existing_digit_needs_no_extra():
    parts = ["s4m", "york", "guitar"]
    ensure_digit(parts, Policy())
    assert parts == ["s4m", "york", "guitar"]


def test_fallback_inserts_digit_inside_word(monkeypatch):
    def choose(seq):
        return (1, 1) if isinstance(seq[0], tuple) else seq[0]

    monkeypatch.setattr("passgen.generator.secrets.choice", choose)
    parts = ["rhythm".replace("t", ""), "crunch"]  # No mapped letters.
    ensure_digit(parts, Policy())
    assert parts == ["rhyhm", "c0runch"]


@pytest.mark.parametrize("use_sets", [False, True])
def test_both_modes_replace_letters_without_suffix(monkeypatch, use_sets):
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    monkeypatch.setattr("passgen.generator.secrets.randbelow", lambda n: 0)
    monkeypatch.setattr("passgen.generator.dictionary", lambda: ("meadow",))
    password = generate(
        Policy(1, False, True, False),
        use_sets=use_sets,
        sets={"people": ["sam"], "places": ["york"], "things": ["guitar"]},
    )
    assert password == ("5amyorkguitar" if use_sets else "m3adowmeadowmeadow")
