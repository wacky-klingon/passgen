import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

export default defineConfig(({ command }) => ({
  // Relative URLs work under both username.github.io and /repository/ Pages sites.
  base: './',
  test: { include: ['tests/**/*.test.js'] },
  plugins: [{
    name: 'license-notices-and-security-policy',
    transformIndexHtml() {
      // Vite development needs injected styles and HMR. Restrict the deployed build.
      if (command !== 'build') return [];
      return [{ tag: 'meta', injectTo: 'head-prepend', attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
      } }];
    },
    generateBundle() {
      for (const [fileName, sourcePath] of [
        ['LICENSE.txt', '../LICENSE'],
        ['WORDLIST_LICENSE.txt', '../src/passgen/data/WORDLIST_LICENSE.txt'],
        ['TOML_LICENSE.txt', './node_modules/smol-toml/LICENSE'],
      ]) {
        this.emitFile({
          type: 'asset', fileName,
          source: readFileSync(new URL(sourcePath, import.meta.url), 'utf8'),
        });
      }
    },
  }],
}));
