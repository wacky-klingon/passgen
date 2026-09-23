# Related GitHub projects

Research snapshot from GitHub repository search and repository READMEs. Counts and repository details may change; this is not a security audit or an exhaustive survey.

| Project | Language | Similar features |
| --- | --- | --- |
| [XKCD-password-generator](https://github.com/redacted/XKCD-password-generator) | Python | Memorable passphrases, bundled dictionaries, custom word files, casing and separators. Closest match. BSD-3-Clause code license. |
| [pwgen-passphrase](https://github.com/xmikos/pwgen-passphrase) | Python | Bundled English dictionaries, custom word lists, casing, separators, entropy target. GPL-3.0. |
| [RandPassGenerator](https://github.com/nsacyber/RandPassGenerator) | Java | CLI passwords and dictionary passphrases, character sets, randomized casing. See repository license. |
| [Password-Generator](https://github.com/KZarzour/Password-Generator) | Java | Length, uppercase/lowercase, numbers and symbols. No dictionary mode documented; no license detected by GitHub. Public availability alone does not establish open-source licensing. |

## How many?

GitHub reported these broad repository-search matches:

- `password generator language:Python`: **39,746**
- `password generator language:Java`: **5,125**
- `passphrase generator language:Python`: **319**

These overlap and include unrelated tools and unlicensed repositories. They are **not verified counts of comparable OSS projects**.

## Differentiator

Our proposed workflow selects exactly **one person + one place + one thing**, configured through TOML, with an English dictionary bypass. That exact workflow was not found in the READMEs examined; this does not establish that it is unique across GitHub.

## Recommendation

Evaluate `xkcdpass` before building the dictionary-generation component from scratch. Its README also documents word-list licensing independently of the code license and recommends at least six words when using the EFF long list.

For the initial implementation, passgen uses its own small `secrets`-based selector and bundles the EFF long list directly, avoiding a runtime dependency on another generator. Four words remain the agreed minimum; six or more are recommended for sensitive use. See the bundled word-list notices for attribution.
