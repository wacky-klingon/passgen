# Passgen generation and browser design

Date: 24 September 2026. Status: P0 implemented in this checkout; P1/P2 remain planned.

This document defines the changes summarized in the [feature sheet](FEATURE_SHEET.md). The [changelog](../changelog.md) records design and implementation progress separately. The [README](../README.md) and [browser guide](../web/README.md) describe current behavior until a feature is implemented and verified.

## Scope and current baseline

The original reviewed source was commit `50e8967` on `feat/browser-app`. It used Python secrets and browser Web Crypto, with a shared normalized dictionary of 7,775 words. Dictionary mode accepted 4–128 words, defaulted to four, and enforced a minimum length of 1–4,096 with no maximum output length. The P0 implementation now defaults to three requested words and enforces a 16–64 default range with a 128-character ceiling.

The original browser output was also the generation button. The P0 implementation separates Generate, output, and Copy; active output moves to capped Recent passwords after ten seconds or replacement. Recent passwords and imported settings remain page-memory only.

The work retains the Python library, CLI, desktop interface, and static browser architecture. Shared generation rules apply across runtimes. The new layout and recent-password lifecycle apply to the browser; there is no desktop history/timer port or CLI history in this scope.

## F11: character range

### Policy contract

| Field | Proposed default | Validation |
|---|---:|---|
| `min_length` | 16 | Integer, excluding booleans; at least 1 and no greater than `max_length`. |
| `max_length` | 64 | Integer, excluding booleans; no greater than the application ceiling of 128. |
| Requested dictionary words | 3 | Integer from 3–128; may be incompatible with the character range. |

Enforce `1 <= min_length <= max_length <= 128` at every entry point. A blank, fractional, non-finite, missing explicit CLI value, boolean, or invalid pair must not silently become a valid range. Omitted optional configuration keys use the defaults. Equal minimum and maximum are allowed as an exact-length request, but may be unattainable for the vocabulary and other settings. Do not add warnings that discourage narrow or exact ranges merely because they are narrow; validate the policy and let bounded generation report failure when a valid result is not found.

The 16–64 default and 128-character ceiling are application choices that bound normal output and work. They are not external standards or a promise that every site accepts those lengths. Users choose limits appropriate to their destination.

Count the complete ASCII result after normalization, substitutions, digit insertion, casing, separators, and any padding words. ASCII output makes character count, Python length, JavaScript string length, and UTF-8 byte length agree. Every successful result must satisfy the inclusive range and all enabled/disabled character requirements.

The requested word count is a minimum number of dictionary selections, not a way to override the character maximum. Never drop words, slice the result, remove mandatory characters, select a shorter vocabulary automatically, or raise the maximum to make a request pass. Do not reject high requested counts solely because they exceed the default range when the user supplied a different valid range; evaluate the actual effective policy.

### Generation algorithm

Keep the existing secure primitives and shared vocabulary. Add a bounded rejection process rather than a length-weighted word sampler:

1. Validate policy, mode, dictionary, and normalized configured sets before sampling. Make inexpensive, sound impossibility checks using the shortest effective entries, mandatory gaps, and requested count. A proven lower bound above `max_length` is an immediate error. Unknown feasibility is not grounds for calling the request impossible.
2. Start a fresh candidate attempt. Draw every initial dictionary word uniformly with replacement from the full effective list, or one normalized entry uniformly from each configured set. Apply the documented transformation, separator, digit, and case rules.
3. If more words are needed for minimum length or an eligible case position, append whole secure dictionary selections while respecting the maximum. Check each length-increasing operation. If a choice makes the candidate exceed the maximum, discard the whole candidate; do not trim it or locally keep redrawing only the last word.
4. Validate the complete candidate against the full policy. Return only a complete valid result. Each returned character, separator, and transformation must have passed final validation.
5. Allow at most 128 candidate attempts per generation request. Each attempt permits at most 128 total selected word/entry parts, including padding. Positive normalized entry lengths and the 128-character ceiling also bound useful padding. Abort on RNG failure immediately; do not treat RNG errors as rejected candidates.
6. If the attempt budget is exhausted, return a distinct generation failure: the chosen settings did not produce a fitting result within the attempt limit. This is not proof that no fitting result exists. Do not publish any partial candidate.

The retry and part budgets are internal constants, not new user controls. They limit the generator’s work; the unbiased low-level random-index rejection step remains unchanged. Feasibility validation runs before exposing interactive UI state changes. Future optimizations must preserve the documented sampling rule or explicitly revise its analysis.

Keep the same candidate ordering across runtimes: select initial parts, apply optional substitutions, ensure a required digit, join with separators, append any length/case padding words, choose an eligible uppercase position if required, then validate the complete result. Padding words follow the same substitution/readability rules. Recheck the maximum after every insertion or append; casing and the current one-character substitutions do not change length.

Configured entries remain unchanged apart from the existing policy normalization. Do not omit long entries from the configured set automatically: draw from the full normalized set and reject the candidate when necessary. Errors must not include personal entries or rejected password text. The current no-retry guarantee is intentionally replaced by a bounded retry contract; document that change when implemented.

### Failure and example behavior

| Case | Required outcome |
|---|---|
| Default 16–64 range | Return only a complete result between 16 and 64 characters. |
| Minimum 30, maximum 20 | Reject settings before generation: “Minimum characters must not exceed maximum characters.” |
| Maximum 129 | Reject settings: “Maximum characters must be 128 or less.” |
| Three words cannot fit the selected range | Explain that the word count and range conflict; suggest increasing maximum or changing word count without applying either change automatically. |
| Short words require padding | Append whole words only when the candidate can fit; otherwise discard the attempt and draw afresh. |
| A last inserted digit takes a candidate from 24 to 25 with max 24 | Reject that candidate; never omit the digit or truncate the output. |
| Sixteen-to-sixteen requested | Return a valid 16-character result if sampled within the budget, otherwise a bounded-search error. |
| Candidate attempts exhausted | “Could not generate a password within these limits. Increase the maximum, lower the minimum, or adjust the word count.” In configured mode, suggest reviewing sets instead of word count. |

The browser preserves an existing active password, its label, and its original expiry deadline when validation or generation fails. It never replaces that value or creates a Recent passwords entry for a failed attempt. The desktop preserves existing output/clipboard; CLI reports a nonzero error on stderr and no partial password on stdout.

### Sampling consequences for F02

Individual candidate word draws remain uniform. Conditioning success on a length range removes some sequences and changes the returned distribution. Configured entries can also become less or more likely among accepted candidates. Finite rejection limits bound work; they do not establish exact output entropy.

Therefore, `k × log2(N)` may be explained only as an unrestricted initial-word model. It is not the actual entropy of an accepted bounded-length password or a guaranteed lower bound. Neither requested counts nor actual counts justify awarding padding, substitution, casing, or separator bits. No cracking-time estimate or strength score is introduced.

Optional F02 help may show “at least 3 words from a list of 7,775 · 16–64 characters.” Explain that extra words may satisfy the minimum and that the length range limits which combinations can be returned. Freeze any generation-specific information with that output; settings summaries describe the next generation.

## Interfaces and migration

The configuration below is supported by the current parser:

```toml
[password]
min_length = 16
max_length = 64
mixed_case = true
numbers = true
symbols = true
```

P0 adds `max_length` to Python Policy, browser defaults and validation, both TOML readers, and shared acceptance checks. It adds `--max-length` to the CLI and desktop startup flags alongside `--min-length`. Preserve CLI-over-config-over-default precedence. Validate the configuration with documented defaults, then validate the effective merged policy; an override must not hide malformed configuration.

Existing files omitting `max_length` use 64. Files with `min_length > 64` need an explicit valid maximum no greater than 128; existing lengths above 128 require revised settings. Invalid legacy configurations fail clearly and are not rewritten. The field is appended to preserve the positional order of existing Python Policy arguments, while new examples use keyword arguments. No version bump or release occurs as part of this implementation change.

Change dictionary initialization, API defaults, CLI fallback/help, desktop startup, browser initialization, and Forget configuration to three requested words. Keep configured mode independent of this control. Preserve current minimum-length value 16 and composition defaults. F08 introduces `substitutions = false` and F09 introduces `easy_to_type = false` with matching validation and explicit controls when implemented; do not add speculative preset profiles.

Browser and desktop show adjacent **Minimum characters** and **Maximum characters** number inputs. Browser settings remain collapsed below the main generation flow. Show range errors inline with clear labels; core validation still enforces the same rules when UI validation is bypassed. The browser summary defaults to “at least 3 words · 16–64 characters · mixed case · numbers · symbols.” Show the actual character count, such as “28 characters,” outside the selectable password text.

Display limits are not implemented through truncating a field or limiting copied text. Wrap the complete result and reserve space for Copy/Copied at the card’s upper-right. The selected character range is the generation limit, independent of the output card’s dimensions.

## F04: browser layout

Order the browser controls below its short introduction as follows:

1. Prominent Generate password button.
2. At least 16 px separation, then a labeled, selectable, read-only output card with Copy in the upper-right corner.
3. Character count, quiet expiry notice, and action status.
4. Settings summary and collapsed Change settings disclosure, including range controls and local TOML import/forget actions.
5. Recent passwords, newest first, masked, and capped at the latest 10 entries.

After the first successful generation, label the primary button Generate another and keep it in place, including after expiry. Refresh restores Generate password. Failed attempts do not change the label. A supporting icon cannot replace explicit text.

The output is not clickable for generation. Copy is a separate button inside a non-clickable card; no nested buttons. Copy has a visible label and accessible name, is disabled for empty output, and briefly shows Copied after confirmed success without shifting layout. Text selection or Copy never generates a replacement. Reserve space for long text and button feedback. No manual editing mode is included.

Use Password requirements and clear labels such as Require a number. Explain the existing rule that unchecked classes are excluded. Changing settings or importing a file affects the next output, not the active password or its deadline. Configuration failure must not silently reactivate old personal sets.

Maintain keyboard focus as labels/status change. Provide visible focus, approximately 44 px touch targets, exact copy equality, and wrapping at 320 px widths and 200% zoom in light/dark themes. Expiry/status announcements do not read the password or each countdown tick.

## F05: browser state and retention

Keep transient state small: current generation ID/password/deadline, one active expiry timer, output version for asynchronous effects, and in-memory recent entries. Repeated identical strings are separate generations. Generation IDs are bookkeeping, never randomness inputs.

| Event | Transition |
|---|---|
| Load | Empty output and Recent passwords; Copy disabled; no automatic generation. |
| Successful generation | Allocate the next ID, display/count the value, start its deadline, and show Generate another. If replacing an active value, first move that prior generation to Recent passwords exactly once. |
| Expiry | Move the active generation once to masked Recent passwords, clear active/fallback text and character count, disable Copy, and show “Moved to recent passwords.” |
| Generation failure | Show a safe error; retain the previous value and deadline, if any. |
| Copy | Invoke only on explicit action; keep deadline unchanged. On confirmed success show Copied. On failure offer the selected read-only manual-copy field while the corresponding generation is active. |
| Settings change | Update the next-generation summary only. |
| Forget configuration | Drop imported sets, restore defaults, discard active output, cancel its timer, and invalidate callbacks. Recent passwords remain until refresh. |
| Refresh | Clear output, imported settings, and Recent passwords; restore initial controls. |

Show “Moves to recent passwords in 10 seconds” independently of Copy feedback. Label recent entries by generation order, such as Password 2. Each recent row starts with Copy, then Show/Hide, then the masked or revealed value. Keep “Shows the latest 10. Cleared when you refresh this page.” Recent passwords are capped at 10 entries; when an eleventh entry is added, drop the oldest entry automatically. No persistent storage, per-row deletion, or recovery service is introduced.

Archive by generation ID with an idempotent operation, then enforce the 10-entry cap after adding the new entry. Expiry, regeneration, and forgetting invalidate stale timers and clipboard UI callbacks. A prior copy completion cannot restore expired plaintext, show a stale fallback, or enable Copy for an empty output. A clipboard write already requested may complete; the app does not promise clipboard erasure.

Reconcile deadlines on tab return and before acting on active output because suspended browsers may delay timers. Clear page state on page exit and also on restoration from a browser back/forward cache so navigation cannot resurrect retained passwords. Ordinary tab switching alone is not a reset; it triggers deadline reconciliation.

Ten seconds is the default. The optional session accessibility choices of 30 or 60 seconds affect the next generation. When used, notices and footer match the selected duration. No forced scrolling or focus movement on expiry. Footer: “New passwords move to Recent passwords after 10 seconds. Recent passwords show the latest 10. Refresh clears this page’s passwords. Copied passwords may remain in clipboard history.”

## Other generation features

F03 samples every separator independently with replacement from `!@#$%&*+-_=?`, including padding gaps. Repetition is valid. Symbols-off mode has no separators.

F08 makes lookalike substitutions explicit and optional. When disabled, required-digit repair must insert a secure random digit at a secure random position instead of replacing a letter. Specify the same eligibility and ordering in Python/browser, and revalidate length after insertion. Do not add exact-count templates or a fixed suffix for purported strength.

F09 avoids introducing 0, 1, I, and O in every transformation, insertion, and capitalization path. Use digits 2–9 and uppercase candidates other than i/o. Existing custom characters remain with a clear limitation. If another dictionary word is needed to obtain an eligible uppercase position, it is a full-list secure padding draw subject to F11; discard an over-limit candidate and respect the same attempt budget. Never introduce an excluded character as a fallback.

F10 preserves secure choices throughout and fresh independent generation per request. Crypto errors fail immediately. Never seed or derive password content from usernames, sites, clocks, IDs, hashes of predictable data, or previous output. History never feeds generation. Test this wiring with controlled choosers, not a flaky assertion that independently generated strings must always differ.

## F07: dictionary release

Retain one shared `src/passgen/data/english.txt`, imported by the browser build. The expansion gate is at least 10,000 reviewed unique effective words, initially lowercase ASCII of 3–9 characters. Align validation and normalize/deduplicate before counting.

Curate offline from sources with documented redistribution rights. Preserve EFF attribution for retained entries and separate notices for additions. Review familiarity, spelling, homophones, and offensive/sensitive terms; do not pad the count with duplicates or obscure variants. Publish source versions/URLs/licenses, changes, filter rules, rejected-entry counts, effective count, and digest in a build manifest. Do not label mixed-source additions as an EFF list.

Commonness affects membership, not sampling weights. Runtime word-pair filtering is not included. F11's final-length rejection is a separate explicit constraint. Verify Python/browser vocabulary identity and browser bundle/load impact before treating expansion as complete.

## Implementation map and checks

| Area | Change | Required evidence |
|---|---|---|
| Python policy/config/CLI/GUI | Range, three-word defaults, future transformation flags | Policy type/range boundaries, precedence, legacy migration, CLI exit/stdout behavior, GUI initialization/reset. |
| Browser policy/config/generator | Same validation and bounded sampling | Boundary and deterministic sampler tests, parity fixtures, failing crypto behavior. |
| Both generators | Full-result bounds, independent separators, substitutions/readability | Never truncate; insertion/padding respects max; configured sets preserved; exact-length success/failure; attempts terminate. |
| Browser HTML/controller/CSS | Main flow, range inputs, Copy overlay, lifecycle | First-use regeneration, exact copy, error preservation, no overlap, keyboard/touch/zoom/themes, timer/copy races. |
| Data and distribution | Expanded list/manifest/notices | Count/license/provenance/normalization identity, installed Python data and browser bundle checks. |
| Documentation | Current behavior and migration | README, browser guide, SECURITY, configuration examples, feature/design status, changelog aligned with the change. |

Use deterministic tiny vocabularies to exercise min/max boundary outputs, a final digit exceeding max, long configured entries, all attempts rejected, successful later attempts, and a proven impossible word count. A min-equals-max request must neither hang nor claim impossibility solely from random search exhaustion. Verify success accepts lengths exactly at both ends and rejects one character outside them.

Lifecycle checks use a controlled clock for no-early-expiry, exactly-once movement, and the 10-entry Recent passwords cap; separately verify suspended-tab return and back/forward restoration. Include stale clipboard completion after expiry/regeneration/forgetting, manual-copy cleanup, recent-row copying while hidden, repeated identical generated strings, and refresh reset. Observe no password-bearing network/storage/log/URL writes.

Run the existing focused Python and JavaScript suites plus production-build browser tests when implementation lands. Add Firefox/Safari verification before claiming those behaviors across browsers. Documentation-only updates require link and diff checks, not generation tests. Deployment continues through the existing Pages workflow only as a separately authorized implementation/release action.

## Documentation maintenance

Update docs in the same change that implements or alters behavior. The [README](../README.md) is the current user contract; the [browser guide](../web/README.md) describes browser operation; [SECURITY.md](../SECURITY.md) states actual boundaries. Keep future flags and examples labeled proposed until supported. Update `examples/passgen.toml` only alongside the implementation that accepts the new keys.

Record each delivered change under Unreleased in [changelog.md](../changelog.md), identifying what changed, compatibility effects, and verification. Move entries to a release section only when released. Update this design and the feature sheet when decisions change; do not imply that acceptance of a design means the implementation is complete. The original [proposal](../PROPOSAL.md) remains historical background with a link here.
