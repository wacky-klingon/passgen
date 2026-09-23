# Security

This initial implementation has not undergone an independent security audit.

- Uses Python `secrets` for random choices; does not use a fallback PRNG.
- Works offline after installation and does not log or retain generated passwords.
- Prints passwords to stdout. Terminal scrollback, redirection, and process wrappers may retain output.
- Configured personal words can be guessed. Substitutions and mixed case do not fix small or predictable sets.
- Dictionary mode defaults to four words; prefer `--words 6` or more for sensitive use. The usable normalized list has 7,775 words. Four independent selections provide approximately 51.7 bits of word-selection entropy; six provide approximately 77.5 bits, before any transformations. These figures are not a security guarantee for every threat model.
- Generation appends words to meet minimum length, so exact maximum lengths imposed by websites are not supported.
- Keep personal TOML files private. The root `passgen.toml` is ignored by Git.

Do not post real passwords, private configuration entries, or exploit details in public issues. No private reporting channel is established yet; maintainers should configure GitHub private vulnerability reporting before a public release. Until then, use an existing private maintainer contact if available rather than disclosing sensitive details publicly.
