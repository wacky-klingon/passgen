import pytest

from passgen import Policy, generate
from passgen.policy import SYMBOLS


@pytest.mark.parametrize("use_sets", [False, True])
@pytest.mark.parametrize("numbers", [False, True])
def test_unique_separators(monkeypatch, use_sets, numbers):
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    monkeypatch.setattr("passgen.generator.stylize", lambda word, policy: word)
    password = generate(
        Policy(1, False, numbers, True),
        use_sets=use_sets,
        sets={"people": ["Sam"], "places": ["York"], "things": ["Book"]},
    )
    separators = [c for c in password if c in SYMBOLS]
    assert len(separators) == (2 if use_sets else 3)
    assert len(set(separators)) == len(separators)


def test_long_password_recycles_pool_without_consecutive_repeats(monkeypatch):
    # Taking the last candidate exercises the pool-reset boundary.
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[-1])
    monkeypatch.setattr("passgen.generator.stylize", lambda word, policy: word)
    policy = Policy(600, False, True, True)
    password = generate(policy)
    assert policy.accepts(password)
    separators = [c for c in password if c in SYMBOLS]
    assert len(separators) > len(SYMBOLS)
    assert all(a != b for a, b in zip(separators, separators[1:]))
    for i in range(0, len(separators), len(SYMBOLS)):
        group = separators[i : i + len(SYMBOLS)]
        assert len(group) == len(set(group))


def test_symbols_disabled():
    password = generate(Policy(200, symbols=False))
    assert not any(c in SYMBOLS for c in password)
