# Security

This initial implementation has not undergone an independent security audit.

These notes describe current behavior. The [design document](docs/DESIGN.md), [feature sheet](docs/FEATURE_SHEET.md), and [changelog.md](changelog.md) distinguish implemented behavior from planned later work.

- Python uses `secrets` for random choices; the browser app uses Web Crypto `getRandomValues()` with rejection sampling. Neither uses a fallback PRNG.
- The static browser app loads assets from its host; generation itself makes no requests. Imported TOML is read locally and kept in memory, never uploaded or placed in browser storage. Do not deploy personal configuration files with the site.
- Serve browser production builds over HTTPS (localhost is suitable for development). Clipboard permissions may be denied; the UI reports failure and offers manual copying. Browser extensions, clipboard history, and compromised hosting or devices remain outside the app's protection. Offline/PWA support is not implemented.
- Python generation works offline after installation and has no history list or password logging. The browser keeps the latest 10 masked recent passwords in page memory until refresh; masking does not securely erase their contents. Active output remains visible for ten seconds unless replaced, forgotten, or refreshed sooner.
- CLI mode prints passwords to stdout. Terminal scrollback, redirection, and process wrappers may retain output.
- The desktop UI displays generated passwords and copies each new password on an explicit click (or Enter/Space) in the output area. Clipboard managers/history may retain passwords; the application does not automatically clear the system clipboard. Passwords remain visible until replaced or the window closes. GUI settings never write to configuration files.
- Configured personal words can be guessed. Substitutions and mixed case do not fix small or predictable sets.
- Dictionary mode defaults to at least three requested words; prefer `--words 6` or more for sensitive use when the selected range can fit them. The usable normalized list has 7,775 words. Three independent unrestricted selections provide about 38.8 bits of word-selection entropy; six provide approximately 77.5 bits, before any transformations. Length filtering changes the returned distribution, so these figures are not final-output entropy or a security guarantee for every threat model.
- Generation enforces the full result against the inclusive minimum/maximum range without truncation, bounds attempts, and fails clearly when settings do not produce a fitting password.
- Keep personal TOML files private. The root `passgen.toml` is ignored by Git.

When generation, defaults, output bounds, clipboard behavior, or retention change, update these notes and the changelog in the same implementation change. Do not present unrestricted word-selection counts as a guarantee for length-filtered final output.

Do not post real passwords, private configuration entries, or exploit details in public issues. No private reporting channel is established yet; maintainers should configure GitHub private vulnerability reporting before a public release. Until then, use an existing private maintainer contact if available rather than disclosing sensitive details publicly.
