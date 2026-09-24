# Passgen feature sheet

Date: 24 September 2026. Status: P0 implemented in this checkout; P1/P2 remain planned.

This is the maintained repository copy of the feature sheet developed in the design discussion. The [design document](DESIGN.md) defines implementation contracts and acceptance criteria. Track completed work in the [changelog](../changelog.md).

## Product direction

Put generation first: **generate → inspect → copy or generate another**. Keep the password selectable and read-only, put Copy in its upper-right corner, and place configuration below the main interaction. After ten seconds, move the active value into masked Recent passwords and reset the output. Keep only the latest 10 recent entries. Refresh clears page state.

Dictionary mode will support 3–128 requested words and default to three. A separate character range controls the entire final password. Proposed defaults are **16–64 characters**, with an application ceiling of **128 characters**. Word counts that cannot fit the range produce a clear error; the generator never truncates, drops requested words, or silently relaxes settings.

## Features

| ID | Priority | Feature | Required result |
|---|---|---|---|
| F02 | P2 | Plain-language word information | Optional help shows requested word count and effective list size. It does not score strength or claim that unrestricted combination counts describe length-constrained output. |
| F03 | P1 | Independent random separators | Every gap independently selects from the full allowed alphabet. Repeats are valid. |
| F04 | P0 implemented | Generation-first layout and clear actions | Prominent Generate password changes to Generate another. Copy sits inside the output card’s upper-right corner. A settings summary and collapsed controls sit below the output and status. |
| F05 | P0 implemented | Ten-second output lifecycle | Explain expiry, move the value once to masked Recent passwords, keep the latest 10 recent entries, reset active output and fallback fields, and confirm the move. Refresh clears page state. |
| F07 | P1 | Expanded curated dictionary | At least 10,000 effective reviewed words, with sources, redistribution terms, attribution, and identical Python/browser vocabulary. |
| F08 | P1 | Optional substitutions | Explicit styling option, disabled by default when introduced. Required digits must work without lookalike substitutions. No advertised entropy bonus. |
| F09 | P1 | Easy-to-type option | Avoid introducing 0, 1, I, and O; preserve normal spelling and disclose that existing personal-set characters are not removed. |
| F10 | P0 implemented, ongoing | Secure independent generation | Preserve Python secrets and browser Web Crypto. Fail closed on RNG errors; do not derive passwords from predictable inputs, history, or prior passwords. |
| F11 | P0 implemented | Minimum and maximum password length | Enforce an inclusive character range in every generator and interface. Default 16–64; hard ceiling 128; bounded attempts; explicit failures without truncation. |

## Defaults and controls

| Setting | Planned default |
|---|---|
| Requested dictionary words | At least 3, configurable from 3–128 subject to character limits |
| Minimum characters | 16 |
| Maximum characters | 64 |
| Mixed case, require numbers, require symbols | On |
| Substitutions, when F08 lands | Off |
| Easy to type, when F09 lands | Off |
| Display duration | 10 seconds |

Show Minimum characters and Maximum characters together inside Change settings. The default compact summary reads “at least 3 words · 16–64 characters · mixed case · numbers · symbols.” Show the actual generated character count next to the active output. These are product limits, not a guarantee of compatibility with every website; users set the range their destination accepts.

The requested word count is a starting minimum, not an exact count. Whole dictionary words may be appended to satisfy the character minimum, provided the final result fits the maximum. Configured mode still selects one person, one place, and one thing; it does not inherit dictionary-strength claims.

## UI and lifecycle

Generate sits above the output with at least 16 px separation. The output card is not clickable for generation. Copy and its Copied feedback have reserved space, visible text, accessible labels, and touch targets. Selecting output or tapping Copy never generates a replacement. Manual editing is outside this version.

After the first successful generation, keep Generate another visible in the same position, including after expiry. Show “Moves to recent passwords in 10 seconds” independently of copy feedback, then “Moved to recent passwords.” Keep focus stable.

Recent passwords are newest-first, masked, capped at the latest 10 entries, and labeled by generation order, such as Password 2. Each row starts with Copy, then Show/Hide, then the masked or revealed value. Keep the text “Shows the latest 10. Cleared when you refresh this page.” No separate history-management feature is required.

Successful early regeneration moves the previous active value once and starts a new deadline. Invalid settings or failed generation preserve the previous value and its existing deadline. Version guards prevent stale timers and clipboard callbacks from restoring expired text or altering a newer value.

## Explanations and security decisions

F02 adds transparency, not strength. For example, an unrestricted toy list of 100 words yields 100 × 100 × 100 possible three-word sequences. The actual usable vocabulary currently has 7,775 entries. Length restrictions discard some sequences and change the distribution, so the interface should say “at least 3 words from a list of 7,775 · 16–64 characters,” without claiming a precise output entropy or cracking time. Longer-word guidance remains useful without a numeric score.

F03 permits both `river!candle?orbit` and `river!candle!orbit`. With 12 allowed symbols and two gaps, this changes 132 non-repeating separator patterns to 144 independently sampled patterns. The security gain is small; the main benefit is a simple, accurately described selection rule. These examples are public illustrations, not passwords to use.

Three requested words favors usability. More independently selected words provide greater guessing resistance before constraints; narrow length ranges and transformations require separate analysis. Personal-set mode carries its existing guessability warning. No substitutions, casing, or separator bonus is advertised.

## Delivery status

1. P0 implemented: F11, the three-word baseline, shared validation, browser range controls, F04/F05 layout and lifecycle, and current F10 invariants.
2. Next planned generation work: F03, then F08/F09 with aligned Python/browser rules.
3. Later planned content work: curate and release F07. Add optional F02 help using the actual bundled metadata and length-constraint caveat.
4. Continue the focused checks and documentation updates in the [design document](DESIGN.md). Record implemented changes in [changelog.md](../changelog.md) as they land.

P0 features are implemented in this checkout. P1/P2 features remain planned. See the README for current supported behavior.
