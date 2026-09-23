import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  // Exercise repository-style Pages hosting rather than only the domain root.
  use: { baseURL: 'http://127.0.0.1:4173/passgen/', headless: true },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort --base /passgen/',
    url: 'http://127.0.0.1:4173/passgen/',
    reuseExistingServer: false,
  },
});
