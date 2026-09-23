# Security

This initial implementation has not undergone an independent security audit.

- Python uses `secrets` for random choices; the browser app uses Web Crypto `getRandomValues()` with rejection sampling. Neither uses a fallback PRNG.
- The static browser app loads assets from its host; generation itself makes no requests. Imported TOML is read locally and kept in memory, never uploaded or placed in browser storage. Do not deploy personal configuration files with the site.
- Serve browser production builds over HTTPS (localhost is suitable for development). Clipboard permissions may be denied; the UI reports failure and offers manual copying. Browser extensions, clipboard history, and compromised hosting or devices remain outside the app's protection. Offline/PWA support is not implemented.
- Works offline after installation and does not log or retain generated passwords.
- CLI mode prints passwords to stdout. Terminal scrollback, redirection, and process wrappers may retain output.
- The desktop UI displays generated passwords and copies each new password on an explicit click (or Enter/Space) in the output area. Clipboard managers/history may retain passwords; the application does not automatically clear the system clipboard. Passwords remain visible until replaced or the window closes. GUI settings never write to configuration files.
- Configured personal words can be guessed. Substitutions and mixed case do not fix small or predictable sets.
- Dictionary mode defaults to four words; prefer `--words 6` or more for sensitive use. The usable normalized list has 7,775 words. Four independent selections provide approximately 51.7 bits of word-selection entropy; six provide approximately 77.5 bits, before any transformations. These figures are not a security guarantee for every threat model.
- Generation appends words to meet minimum length, so exact maximum lengths imposed by websites are not supported.
- Keep personal TOML files private. The root `passgen.toml` is ignored by Git.

Do not post real passwords, private configuration entries, or exploit details in public issues. No private reporting channel is established yet; maintainers should configure GitHub private vulnerability reporting before a public release. Until then, use an existing private maintainer contact if available rather than disclosing sensitive details publicly.
