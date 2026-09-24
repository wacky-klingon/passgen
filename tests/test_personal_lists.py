import hashlib
import json
from importlib.resources import files

import pytest

from passgen import Policy, generate
from passgen.cli import main
from passgen.personal_lists import (
    default_personal_lists,
    load_personal_file,
    parse_personal_list,
)


def test_personal_list_parsing_and_private_errors():
    policy = Policy(1, False, False, False)
    assert parse_personal_list(" Sam \n\n New York\r\n", "people", policy) == [
        "Sam",
        "New York",
    ]
    with pytest.raises(ValueError, match="people list has an invalid entry") as error:
        parse_personal_list("Private東京", "people", policy)
    assert "Private" not in str(error.value)
    with pytest.raises(ValueError, match="needs at least one"):
        parse_personal_list("\n  \n", "people", policy)


def test_packaged_default_txt_lists_are_loaded():
    assert default_personal_lists(Policy(numbers=False, symbols=False)) == {
        "people": ["Sam", "Alex"],
        "places": ["New York", "London"],
        "things": ["Guitar", "Coffee"],
    }


def test_file_overrides_legacy_toml_category(tmp_path, monkeypatch, capsys):
    (tmp_path / "passgen.toml").write_text(
        '[sets]\npeople=["Old"]\nplaces=["York"]\nthings=["Book"]\n'
    )
    (tmp_path / "names.txt").write_text("Sam\n")
    monkeypatch.chdir(tmp_path)
    assert (
        main(
            [
                "generate",
                "--use-sets",
                "--people-file",
                "names.txt",
                "--min-length",
                "1",
                "--no-mixed-case",
                "--no-numbers",
                "--no-symbols",
            ]
        )
        == 0
    )
    assert capsys.readouterr().out.strip() == "samyorkbook"


def test_file_read_and_generation(tmp_path):
    policy = Policy(1, False, False, False)
    entries = {}
    for category, value in (
        ("people", "Sam"),
        ("places", "New York"),
        ("things", "Guitar"),
    ):
        path = tmp_path / f"{category}.txt"
        path.write_text(value + "\n")
        entries[category] = load_personal_file(path, category, policy)
    assert generate(policy, use_sets=True, sets=entries) == "samnewyorkguitar"


def test_bundled_manifest_matches_data():
    data = files("passgen").joinpath("data/wordlist.txt").read_bytes()
    manifest = json.loads(
        files("passgen").joinpath("data/WORDLIST_MANIFEST.json").read_text()
    )
    assert hashlib.sha256(data).hexdigest() == manifest["output_sha256"]
    assert manifest["effective_words"] >= 10000
