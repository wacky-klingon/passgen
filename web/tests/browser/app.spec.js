import { test, expect } from '@playwright/test';

test('generates without auto-copy and copies only on request, without network or storage writes', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('#status')).toHaveText('Ready.');
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  const output = page.locator('#password');
  await expect(page.locator('#copy')).toBeDisabled();
  await page.evaluate(() => navigator.clipboard.writeText('unchanged'));
  await page.locator('#generate').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('unchanged');
  await expect(page.locator('#generate')).toHaveText('Generate another');
  await expect(page.locator('#output-meta')).toContainText(/^\d+ characters\. Moves to recent passwords in 10 seconds\.$/);
  await page.locator('#copy').click();
  await expect(page.locator('#status')).toContainText('Password copied');
  const password = await output.inputValue();
  expect(password.length).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(password);
  await output.focus();
  await output.press('Enter');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(password);
  await page.locator('#copy').focus();
  await page.locator('#copy').press('Enter');
  await expect(page.locator('#status')).toContainText('Password copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await output.inputValue());
  await expect(page.locator('#password-history li')).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('default TXT lists are visible and ready for configured mode', async ({ page }) => {
  await page.goto('./');
  await page.locator('main > details > summary').click();
  await expect(page.getByText('Local TOML configuration')).toHaveCount(0);
  await expect(page.locator('#people-paste')).toHaveValue('Sam\nAlex');
  await expect(page.locator('#places-paste')).toHaveValue('New York\nLondon');
  await expect(page.locator('#things-paste')).toHaveValue('Guitar\nCoffee');
  await expect(page.locator('#people-status')).toContainText('2 usable names entries (default names.txt)');
  await page.locator('#min-length').fill('1');
  await page.locator('#mixed-case').uncheck();
  await page.locator('#numbers').uncheck();
  await page.locator('#symbols').uncheck();
  await page.locator('#mode').selectOption('configured');
  await expect(page.locator('#words')).toBeDisabled();
  await page.locator('#generate').click();
  await expect(page.locator('#password')).toHaveValue(/^(sam|alex)(newyork|london)(guitar|coffee)$/);
});

test('personal TXT files and pasted lists replace categories locally', async ({ page }) => {
  await page.goto('./');
  await page.locator('main > details > summary').click();
  await page.locator('#min-length').fill('1');
  await page.locator('#mixed-case').uncheck();
  await page.locator('#numbers').uncheck();
  await page.locator('#symbols').uncheck();
  await page.locator('#mode').selectOption('configured');
  await page.locator('#people-file').setInputFiles({ name: 'names.txt', mimeType: 'text/plain', buffer: Buffer.from('Sam\nS am\n') });
  await expect(page.locator('#people-status')).toContainText('1 usable names');
  await page.locator('#places-paste').fill('New York\n');
  await page.locator('#places-use-paste').click();
  await page.locator('#things-file').setInputFiles({ name: 'things.txt', mimeType: 'text/plain', buffer: Buffer.from('Guitar\n') });
  await page.locator('#generate').click();
  await expect(page.locator('#password')).toHaveValue('samnewyorkguitar');
  await page.locator('#people-file').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('Private東京') });
  await expect(page.locator('#list-status')).toContainText('invalid entry');
  await expect(page.locator('#people-status')).toContainText('1 usable names');
  await page.locator('#people-clear').click();
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText('Add a names list');
  await page.reload();
  await page.locator('main > details > summary').click();
  await expect(page.locator('#people-status')).toContainText('2 usable names entries (default names.txt)');
});

test('word information and longer visibility option describe the next generation', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-24T12:00:00Z') });
  await page.goto('./');
  await page.locator('main > details > summary').click();
  await page.locator('#word-info > summary').click();
  await expect(page.locator('#word-info-text')).toContainText('10,754 usable words');
  await page.locator('#display-duration').selectOption('30');
  await expect(page.locator('#footer-duration')).toHaveText('30 seconds');
  await page.locator('#generate').click();
  await expect(page.locator('#expiry')).toHaveText('Moves to recent passwords in 30 seconds.');
  await page.clock.fastForward(10000);
  await expect(page.locator('#password')).not.toHaveValue('');
});

test('personal-list controls fit a narrow viewport and keep keyboard labels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./');
  await page.locator('main > details > summary').click();
  await expect(page.getByLabel('Select names.txt')).toBeVisible();
  await expect(page.getByLabel('Or edit names')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('clipboard denial reports failure but retains generated output', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText() { return Promise.reject(new Error('denied')); } } });
  });
  await page.goto('./');
  await page.locator('#generate').click();
  await page.locator('#copy').click();
  await expect(page.locator('#status')).toContainText('copying failed');
  await expect(page.locator('#copy-text')).toBeVisible();
  await expect(page.locator('#copy-text')).toHaveValue(await page.locator('#password').inputValue());
  expect((await page.locator('#password').inputValue()).length).toBeGreaterThanOrEqual(16);
  await expect(page.locator('#password')).toBeEditable({ editable: false });
});

test('invalid controls do not replace the output', async ({ page }) => {
  await page.goto('./');
  await page.locator('main > details > summary').click();
  await page.locator('#min-length').fill('0');
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText('Minimum length');
  await expect(page.locator('#password')).toHaveValue('');
});
