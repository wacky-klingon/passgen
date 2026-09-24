"""Rebuild the bundled list from verified offline source downloads."""

import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile

SOURCES = {
    "eff_long": (
        "https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt",
        "addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e",
    ),
    "eff_short_1": (
        "https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt",
        "8f5ca830b8bffb6fe39c9736c024a00a6a6411adb3f83a9be8bfeeb6e067ae69",
    ),
    "eff_short_2": (
        "https://www.eff.org/files/2016/09/08/eff_short_wordlist_2_0.txt",
        "22b45c52e0bd0bbf03aa522240b111eb4c7c0c1d86c4e518e1be2a7eb2a625e4",
    ),
    "scowl": (
        "https://downloads.sourceforge.net/project/wordlist/SCOWL/2020.12.07/scowl-2020.12.07.zip",
        "dc3435e1cb56f3394aea91b5d2ab5d10d80c98bc7dd88c3fccb7348f6ab913a0",
    ),
}
SENSITIVE = {
    "abuse",
    "abused",
    "abuses",
    "abusive",
    "assault",
    "assaults",
    "death",
    "died",
    "dying",
    "kill",
    "killed",
    "killing",
    "kills",
    "murder",
    "murdered",
    "murders",
    "rape",
    "sex",
    "suicide",
    "terror",
    "victim",
    "victims",
    "violence",
    "violent",
    "war",
    "wars",
}
SCOWL_FILES = ("final/english-words.10", "final/american-words.10")


def verified(path: Path, source: str) -> bytes:
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCES[source][1]:
        raise ValueError(f"{source} checksum mismatch")
    return data


def normalized(word: str) -> str:
    return word.lower().replace("-", "")


def build(paths: dict[str, Path], output: Path, manifest: Path) -> None:
    long_lines = [
        line.split()[-1]
        for line in verified(paths["eff_long"], "eff_long").decode().splitlines()
        if line.strip()
    ]
    if len(long_lines) != 7776:
        raise ValueError("EFF long list count changed")
    words = list(long_lines)
    effective = {normalized(word) for word in words}
    contributions = {}
    rejected = {}
    for source in ("eff_short_1", "eff_short_2", "scowl"):
        if source == "scowl":
            verified(paths[source], source)
            with ZipFile(paths[source]) as archive:
                candidates = [
                    word
                    for name in SCOWL_FILES
                    for word in archive.read(name).decode("latin-1").splitlines()
                ]
        else:
            candidates = [
                line.split()[-1]
                for line in verified(paths[source], source).decode().splitlines()
                if line.strip()
            ]
        additions = set()
        invalid = 0
        sensitive = 0
        duplicates = 0
        for candidate in candidates:
            word = normalized(candidate)
            if not re.fullmatch(r"[a-z]{3,9}", word):
                invalid += 1
            elif word in SENSITIVE:
                sensitive += 1
            elif word in effective or word in additions:
                duplicates += 1
            else:
                additions.add(word)
        words.extend(sorted(additions))
        effective.update(additions)
        contributions[source] = len(additions)
        rejected[source] = {
            "format_or_length": invalid,
            "sensitive": sensitive,
            "duplicates": duplicates,
        }
    if len(effective) < 10000:
        raise ValueError("effective list is below 10,000 words")
    result = ("\n".join(words) + "\n").encode()
    output.write_bytes(result)
    manifest.write_text(
        json.dumps(
            {
                "sources": {
                    name: {"url": url, "sha256": digest}
                    for name, (url, digest) in SOURCES.items()
                },
                "source_words": 7776,
                "added_by_source": contributions,
                "rejected_by_source": rejected,
                "filter": "ASCII lowercase letters, 3-9 characters after removing hyphens; omit listed sensitive words; deduplicate after normalization",
                "sensitive_exclusions": sorted(SENSITIVE),
                "effective_words": len(effective),
                "output_sha256": hashlib.sha256(result).hexdigest(),
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in SOURCES:
        parser.add_argument(f"--{name.replace('_', '-')}", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    build({name: getattr(args, name) for name in SOURCES}, args.output, args.manifest)
