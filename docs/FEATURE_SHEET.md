# Passgen feature sheet

Date: 24 September 2026. Status: F02, F03, F04, F05, F07, F08, F09, F10, F11, and F12 implemented in this checkout.

This is the maintained repository copy of the feature sheet developed in the design discussion. The [design document](DESIGN.md) defines implementation contracts and acceptance criteria. Track completed work in the [changelog](../changelog.md).

## Product direction

Put generation first: **generate → inspect → copy or generate another**. Keep the password selectable and read-only, put Copy in its upper-right corner, and place configuration below the main interaction. After the selected 10, 30, or 60 seconds, move the active value into masked Recent passwords and reset the output. Keep only the latest 10 recent entries. Refresh clears page state.

Dictionary mode supports 3–128 requested words and defaults to three. A separate character range controls the entire final password. Defaults are **16–64 characters**, with an application ceiling of **128 characters**. Word counts that cannot fit the range produce a clear error; the generator never truncates, drops requested words, or silently relaxes settings.

## Features

| ID | Priority | Feature | Required result |
|---|---|---|---|
| F02 | Implemented | Plain-language word information | Optional browser help shows requested word count and effective list size without a strength score. |
| F03 | Implemented | Independent random separators | Every gap independently selects from the full allowed alphabet. Repeats are valid. |
| F04 | P0 implemented | Generation-first layout and clear actions | Prominent Generate password changes to Generate another. Copy sits inside the output card’s upper-right corner. A settings summary and collapsed controls sit below the output and status. |
| F05 | P0 implemented | Ten-second output lifecycle | Explain expiry, move the value once to masked Recent passwords, keep the latest 10 recent entries, reset active output and fallback fields, and confirm the move. Refresh clears page state. |
| F07 | Implemented | Expanded curated dictionary | 10,754 effective words from EFF and SCOWL sources, with manifest, license notices, and shared Python/browser vocabulary. |
| F08 | Implemented | Optional substitutions | Explicit styling option, off by default. Required digits work without lookalike substitutions. No advertised entropy bonus. |
| F09 | Implemented | Easy-to-type option | Avoid introducing 0, 1, I, and O; existing personal-set characters remain. |
| F10 | P0 implemented, ongoing | Secure independent generation | Preserve Python secrets and browser Web Crypto. Fail closed on RNG errors; do not derive passwords from predictable inputs, history, or prior passwords. |
| F11 | P0 implemented | Minimum and maximum password length | Enforce an inclusive character range in every generator and interface. Default 16–64; hard ceiling 128; bounded attempts; explicit failures without truncation. |
| F12 | Implemented | Plain-text personal lists | People, Places, and Things start with visible packaged TXT defaults. The web and desktop interfaces replace lists with `.txt` files; the browser also accepts pasted edits. TOML is absent from both interfaces. |

## Defaults and controls

| Setting | Current default |
|---|---|
| Requested dictionary words | At least 3, configurable from 3–128 subject to character limits |
| Minimum characters | 16 |
| Maximum characters | 64 |
| Mixed case, require numbers, require symbols | On |
| Substitutions | Off |
| Easy to type | Off |
| Display duration | 10 seconds |

Show Minimum characters and Maximum characters together inside Change settings. The default compact summary reads “at least 3 words · 16–64 characters · mixed case · numbers · symbols.” Show the actual generated character count next to the active output. These are product limits, not a guarantee of compatibility with every website; users set the range their destination accepts.

The requested word count is a starting minimum, not an exact count. Whole dictionary words may be appended to satisfy the character minimum, provided the final result fits the maximum. Configured mode still selects one person, one place, and one thing; it does not inherit dictionary-strength claims.

F12 uses one-entry-per-line `names.txt`, `places.txt`, and `things.txt` files. Packaged defaults are loaded and displayed by the web and desktop interfaces. The browser offers file pickers and editable paste boxes under Change settings, displays usable entry counts, and keeps replacements in page memory. A cleared category blocks configured generation with a clear error. Dictionary mode uses the bundled `wordlist.txt`. TOML remains only as legacy CLI compatibility; it is not shown or loaded by either UI. Python has `--people-file`, `--places-file`, and `--things-file`. See [F12 in the design](DESIGN.md#f12-plain-text-personal-lists) for replacement and validation rules.

## UI and lifecycle

Generate sits above the output with at least 16 px separation. The output card is not clickable for generation. Copy and its Copied feedback have reserved space, visible text, accessible labels, and touch targets. Selecting output or tapping Copy never generates a replacement. Manual editing is outside this version.

After the first successful generation, keep Generate another visible in the same position, including after expiry. Show a countdown such as “Moves to recent passwords in 10 seconds” independently of copy feedback, then “Moved to recent passwords.” Keep focus stable.

Recent passwords are newest-first, masked, capped at the latest 10 entries, and labeled by generation order, such as Password 2. Each row starts with Copy, then Show/Hide, then the masked or revealed value. Keep the text “Shows the latest 10. Cleared when you refresh this page.” No separate history-management feature is required.

Successful early regeneration moves the previous active value once and starts a new deadline. Invalid settings or failed generation preserve the previous value and its existing deadline. Version guards prevent stale timers and clipboard callbacks from restoring expired text or altering a newer value.

## Explanations and security decisions

F02 adds transparency, not strength. For example, an unrestricted toy list of 100 words yields 100 × 100 × 100 possible three-word sequences. The actual usable vocabulary has 10,754 entries. Length restrictions discard some sequences and change the distribution, so the help shows the requested word count and list size without claiming a precise output entropy or cracking time.

F03 permits both `river!candle?orbit` and `river!candle!orbit`. With 12 allowed symbols and two gaps, this changes 132 non-repeating separator patterns to 144 independently sampled patterns. The security gain is small; the main benefit is a simple, accurately described selection rule. These examples are public illustrations, not passwords to use.

Three requested words favors usability. More independently selected words provide greater guessing resistance before constraints; narrow length ranges and transformations require separate analysis. Personal-set mode carries its existing guessability warning. No substitutions, casing, or separator bonus is advertised.

## Delivery status

The listed features are implemented in this checkout. F07's reproducible source manifest and notices are shipped with the data. See the [README](../README.md) for current usage and [changelog.md](../changelog.md) for validation. Deployment remains a separate release action.
