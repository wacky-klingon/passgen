import itertools
import subprocess
import sys

import pytest

from passgen import Policy, generate
from passgen.cli import main
from passgen.config import load_config, load_policy
from passgen.generator import dictionary, normalize

SETS = {"people": ["Sam"], "places": ["New York"], "things": ["Guitar"]}


@pytest.mark.parametrize(
    "mixed,numbers,symbols,use_sets", list(itertools.product([False, True], repeat=4))
)
def test_all_policies(mixed, numbers, symbols, use_sets):
    policy = Policy(100, mixed, numbers, symbols)
    assert policy.accepts(generate(policy, use_sets=use_sets, sets=SETS))


def test_exactly_one_per_set(monkeypatch):
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    assert (
        generate(Policy(1, False, False, False), use_sets=True, sets=SETS)
        == "samnewyorkguitar"
    )


def test_four_dictionary_words(monkeypatch):
    monkeypatch.setattr("passgen.generator.secrets.choice", lambda seq: seq[0])
    assert (
        generate(Policy(1, False, False, False), sets="invalid") == dictionary()[0] * 4
    )
    assert generate(Policy(1, False, False, False), words=6) == dictionary()[0] * 6


def test_dictionary():
    words = dictionary()
    assert len(words) >= 7700
    assert len(words) == len(set(words))
    assert all(w.isascii() and w.isalpha() and w.islower() for w in words)


@pytest.mark.parametrize(
    "sets",
    [
        None,
        {},
        {**SETS, "people": []},
        {**SETS, "things": [1]},
        {**SETS, "places": ["東京"]},
        {**SETS, "people": [" "]},
    ],
)
def test_invalid_sets(sets):
    with pytest.raises(ValueError):
        generate(use_sets=True, sets=sets)


def test_normalization():
    assert normalize(" Sam 42!\t", Policy(numbers=False, symbols=False)) == "sam"
    with pytest.raises(ValueError):
        normalize("42!", Policy(numbers=False, symbols=False))


def test_nonletter_sets():
    policy = Policy(1)
    assert policy.accepts(
        generate(policy, use_sets=True, sets={n: ["42!"] for n in SETS})
    )


@pytest.mark.parametrize(
    "settings",
    [
        {"min_length": 0},
        {"min_length": True},
        {"min_length": 4097},
        {"numbers": "yes"},
        {"symbols": 1},
        {"mixed_case": None},
    ],
)
def test_invalid_policy(settings):
    with pytest.raises(ValueError):
        Policy(**settings)


def test_config_precedence():
    policy = load_policy(
        {"password": {"min_length": 20, "symbols": False}},
        {"min_length": 30, "numbers": None},
    )
    assert policy == Policy(30, True, True, False)
    with pytest.raises(ValueError):
        load_policy({"password": {"numbers": "yes"}}, {"numbers": True})
    with pytest.raises(ValueError):
        load_policy({"password": {"typo": True}}, {})


def test_config_files(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert load_config() == {}
    with pytest.raises(ValueError):
        load_config(tmp_path / "missing.toml")
    path = tmp_path / "passgen.toml"
    path.write_text("[password]\nmin_length=24\n")
    assert load_config()["password"]["min_length"] == 24
    path.write_text("[private secret")
    with pytest.raises(ValueError, match="TOML syntax") as error:
        load_config()
    assert "private secret" not in str(error.value)


def test_cli_bypass(tmp_path, capsys):
    path = tmp_path / "config.toml"
    path.write_text('sets = "invalid"\n[password]\nmin_length=40\n')
    assert main(["generate", "--config", str(path), "--no-sets"]) == 0
    output = capsys.readouterr()
    assert not output.err
    assert len(output.out.splitlines()) == 1
    assert Policy(40).accepts(output.out.strip())


def test_cli_configured(tmp_path, capsys):
    path = tmp_path / "config.toml"
    path.write_text('[sets]\npeople=["Sam"]\nplaces=["New York"]\nthings=["Guitar"]')
    assert main(["generate", "--config", str(path), "--use-sets"]) == 0
    output = capsys.readouterr()
    assert "Warning:" in output.err
    assert Policy().accepts(output.out.strip())


@pytest.mark.parametrize(
    "args",
    [
        ["--use-sets", "--no-sets"],
        ["--min-length", "0"],
        ["--words", "3"],
        ["--use-sets", "--words", "6"],
    ],
)
def test_cli_errors(args, tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    with pytest.raises(SystemExit) as error:
        main(["generate", *args])
    assert error.value.code == 2
    assert capsys.readouterr().out == ""


def test_module_entrypoint(tmp_path):
    result = subprocess.run(
        [sys.executable, "-m", "passgen", "generate", "--no-sets"],
        cwd=tmp_path,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert result.stderr == ""
    assert Policy().accepts(result.stdout.strip())
