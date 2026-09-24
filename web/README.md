# passgen browser app

A static HTML/CSS/JavaScript version of passgen, alongside the existing Python app. Uses Vite, Web Crypto, and a bundled TOML parser. No backend or frontend framework.

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
- Optional local TOML import reads existing people, places, and things sets and password defaults. Import never uploads data or edits files. The browser cannot automatically read the repository's or user's `passgen.toml`.
- Configured mode selects exactly one entry from each set; word count is disabled in this mode.
- Mixed-case, digit, and symbol requirements follow the Python implementation.
- Light lookalike substitutions, random-position digit fallback, and non-repeating separator pools.
- Use Generate password, then Generate another, to create values. Generation does not change the clipboard. Use the Copy button inside the output card to copy the current password; clipboard failures expose a selected read-only field for manual copying.
- Active output shows its character count and a ten-second countdown before moving to masked Recent passwords, or moves immediately when another password replaces it. Recent passwords are newest-first, capped at the latest 10, and have Copy plus Show/Hide controls per entry. Refresh clears the page state.
- Minimum characters and Maximum characters define the final-output range, defaulting to 16–64 with a ceiling of 128. Generation fails clearly rather than truncating, dropping requested words, or silently relaxing settings.
- Policy controls are temporary. No localStorage, sessionStorage, database, analytics, external fonts, or CDN scripts.
- Forget configuration discards imported sets, restores defaults, and clears active output. It does not clear Recent passwords, erase clipboard history, or guarantee secure erasure from browser memory.

The dictionary is imported directly from `../src/passgen/data/english.txt` at build time. Normalization removes hyphens and deduplicates, yielding 7,775 selectable words. Do not maintain a separate copy.

## Tests

```bash
npm test
npx playwright install chromium
npm run test:browser
```

Vitest covers generation, policies, configuration, and unbiased rejection sampling. Playwright exercises the production build in Chromium, including local file import and clipboard denial. Firefox/Safari behavior still needs verification before declaring cross-browser support. The existing Python test suite remains independent.

`package-lock.json` pins dependencies. CI uses `npm ci`; no Node dependencies are required on the hosting server after the static build.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. Nothing is published by local development or by pushes to the feature branch. Documentation updates do not by themselves implement or deploy the planned design.

When ready to publish:

1. Review and merge the browser implementation into `main`.
2. In the GitHub repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
3. Run **Deploy browser app to Pages** from the Actions tab on `main` (or push a browser change to `main`).
4. Open the URL reported by the deployment.

The workflow tests and builds `web/dist`, uploads the artifact, and deploys using GitHub's Pages actions. Relative asset URLs support repository subpaths such as `https://USERNAME.github.io/REPOSITORY/`. Do not publish personal TOML files alongside the site.

## Security and limitations

- `crypto.getRandomValues()` is the only randomness source. Rejection sampling avoids modulo bias; there is no `Math.random()` fallback.
- Generation runs in-browser and makes no network requests after initial asset loading. GitHub still serves those initial requests and may retain hosting access logs.
- The production HTML includes a restrictive Content Security Policy. Vite development mode omits it to support injected styles and hot reload; deploy only the production build.
- Clipboard access requires browser permission and may fail. Passwords remain visible for ten seconds before moving to masked Recent passwords. Extensions, compromised devices, clipboard managers, and untrusted served JavaScript remain risks.
- Refreshing the page forgets imported configuration and Recent passwords. Offline/PWA installation is not implemented; first load and reload may require a network connection.
- This is an initial port, not an independent security audit or a claim of exact random-output equivalence with Python.

## Keeping this guide current

Update controls, defaults, clipboard behavior, retention, range limits, and browser verification claims in the same change that implements them. Add an implementation entry to [changelog.md](../changelog.md) with the relevant validation. Keep this guide and the [root README](../README.md) aligned; proposed settings must not appear as working examples before implementation.

## Licenses

Application code: MIT. EFF word-list data: CC BY 3.0 US. `smol-toml`: BSD-3-Clause. The build includes separate code, word-list, and TOML parser notices with links from the page footer.
