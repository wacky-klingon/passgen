# passgen browser app

A static HTML/CSS/JavaScript version of passgen, alongside the existing Python app. Uses Vite and Web Crypto. No backend, frontend framework, or TOML parser.

Open the [browser app](https://wacky-klingon.github.io/passgen/). The [design document](../docs/DESIGN.md), [feature sheet](../docs/FEATURE_SHEET.md), and [changelog](../changelog.md) track design and implementation progress. This guide describes current behavior in the repository checkout.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended) and npm:

```bash
cd web
npm ci
npm run dev
```

Open the localhost URL printed by Vite. For a production build:

```bash
npm run build
npm run preview
```

Do not open `index.html` directly with a `file://` URL. Use localhost or HTTPS so modules and clipboard APIs work correctly.

## Features

- Dictionary generation defaults to at least three requested words; choose six or more for sensitive accounts when the selected character range can fit them.
- Packaged `names.txt`, `places.txt`, and `things.txt` defaults are visible on load. Each category can be edited, pasted, replaced with a local TXT file, or cleared independently. Inputs stay in page memory, with no upload or file edits. TOML is not part of the browser interface.
- Configured mode selects exactly one entry from each set; word count is disabled in this mode.
- Mixed-case, digit, and symbol requirements follow the Python implementation.
- Independent random separators that may repeat, optional lookalike substitutions (off by default), random-position digit insertion when substitutions are off, and an Easy to type option that avoids introducing `0`, `1`, `I`, and `O`.
- Use Generate password, then Generate another, to create values. Generation does not change the clipboard. Use the Copy button inside the output card to copy the current password; clipboard failures expose a selected read-only field for manual copying.
- Active output shows its character count and a countdown before moving to masked Recent passwords, or moves immediately when another password replaces it. Choose 10, 30, or 60 seconds for the next password. Recent passwords are newest-first, capped at the latest 10, and have Copy plus Show/Hide controls per entry. Refresh clears the page state.
- Minimum characters and Maximum characters define the final-output range, defaulting to 16–64 with a ceiling of 128. Generation fails clearly rather than truncating, dropping requested words, or silently relaxing settings.
- Policy controls are temporary. No localStorage, sessionStorage, database, analytics, external fonts, or CDN scripts.
- Refresh discards pasted or imported personal lists, restores the packaged TXT defaults, and clears active and recent passwords. It does not erase clipboard history or guarantee secure erasure from browser memory.
- About word selection shows the requested count and the effective bundled list size. The length range affects which combinations can be returned, so this is not a strength score.

The dictionary and default personal lists are imported directly from `../src/passgen/data/` at build time. Dictionary normalization removes hyphens and deduplicates, yielding 10,754 selectable words. See the [source manifest](../src/passgen/data/WORDLIST_MANIFEST.json).

## Tests

```bash
npm test
npx playwright install chromium
npm run test:browser
```

Vitest covers generation, policies, personal-list parsing, and unbiased rejection sampling. Playwright exercises the production build in Chromium, including visible defaults, local file import, and clipboard denial. Firefox/Safari behavior still needs verification before declaring cross-browser support. The existing Python test suite remains independent.

`package-lock.json` pins dependencies. CI uses `npm ci`; no Node dependencies are required on the hosting server after the static build.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. Nothing is published by local development or by pushes to the feature branch. Documentation updates do not by themselves implement or deploy the planned design.

When ready to publish:

1. Review and merge the browser implementation into `main`.
2. In the GitHub repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
3. Run **Deploy browser app to Pages** from the Actions tab on `main` (or push a browser change to `main`).
4. Open the URL reported by the deployment.

The workflow tests and builds `web/dist`, uploads the artifact, and deploys using GitHub's Pages actions. Relative asset URLs support repository subpaths such as `https://USERNAME.github.io/REPOSITORY/`. Do not add private entries to the packaged default TXT files.

## Security and limitations

- `crypto.getRandomValues()` is the only randomness source. Rejection sampling avoids modulo bias; there is no `Math.random()` fallback.
- Generation runs in-browser and makes no network requests after initial asset loading. GitHub still serves those initial requests and may retain hosting access logs.
- The production HTML includes a restrictive Content Security Policy. Vite development mode omits it to support injected styles and hot reload; deploy only the production build.
- Clipboard access requires browser permission and may fail. Passwords remain visible for ten seconds before moving to masked Recent passwords. Extensions, compromised devices, clipboard managers, and untrusted served JavaScript remain risks.
- Refreshing the page forgets edited/imported lists and Recent passwords, then restores the public packaged defaults. Offline/PWA installation is not implemented; first load and reload may require a network connection.
- This is an initial port, not an independent security audit or a claim of exact random-output equivalence with Python.

## Keeping this guide current

Update controls, defaults, clipboard behavior, retention, range limits, and browser verification claims in the same change that implements them. Add an implementation entry to [changelog.md](../changelog.md) with the relevant validation. Keep this guide and the [root README](../README.md) aligned; proposed settings must not appear as working examples before implementation.

## Licenses

Application code: MIT. Word-list data includes EFF CC BY 3.0 US and SCOWL's permission terms; see the [source notice](../src/passgen/data/WORDLIST_LICENSE.txt) and [SCOWL copyright](../src/passgen/data/SCOWL_COPYRIGHT.txt). The build includes separate notices linked from the page footer.
