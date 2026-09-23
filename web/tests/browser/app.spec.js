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
  await output.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('unchanged');
  await page.locator('#copy').click();
  await expect(page.locator('#status')).toContainText('Password copied');
  const password = await output.textContent();
  expect(password.length).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(password);
  await output.focus();
  await output.press('Enter');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(password);
  await page.locator('#copy').focus();
  await page.locator('#copy').press('Enter');
  await expect(page.locator('#status')).toContainText('Password copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await output.textContent());
  await expect(page.locator('#password-history li')).toHaveCount(2);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('local TOML import, configured mode, forgetting, and private errors', async ({ page }) => {
  await page.goto('./');
  await page.locator('summary').click();
  await page.locator('#config').setInputFiles({
    name: 'personal.toml', mimeType: 'text/plain',
    buffer: Buffer.from('[password]\nmin_length=1\nmixed_case=false\nnumbers=false\nsymbols=false\n[sets]\npeople=["Sam"]\nplaces=["New York"]\nthings=["Guitar"]'),
  });
  await expect(page.locator('#config-status')).toContainText('Configuration loaded locally');
  await page.locator('#mode').selectOption('configured');
  await expect(page.locator('#words')).toBeDisabled();
  await page.locator('#password').click();
  await expect(page.locator('#password')).toHaveText('samnewyorkguitar');
  await page.locator('#forget').click();
  await expect(page.locator('#copy')).toBeDisabled();
  await expect(page.locator('#words')).toBeEnabled();
  await page.locator('#mode').selectOption('configured');
  await page.locator('#password').click();
  await expect(page.locator('#status')).toContainText('Import a TOML');
  await page.locator('#config').setInputFiles({
    name: 'bad.toml', mimeType: 'text/plain', buffer: Buffer.from('[private secret'),
  });
  await expect(page.locator('#config-status')).toHaveText('Cannot read configuration. Check the TOML syntax.');
});

test('clipboard denial reports failure but retains generated output', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText() { return Promise.reject(new Error('denied')); } } });
  });
  await page.goto('./');
  await page.locator('#password').click();
  await page.locator('#copy').click();
  await expect(page.locator('#status')).toContainText('copying failed');
  await expect(page.locator('#copy-text')).toBeVisible();
  await expect(page.locator('#copy-text')).toHaveValue(await page.locator('#password').textContent());
  expect((await page.locator('#password').textContent()).length).toBeGreaterThanOrEqual(16);
  await expect(page.locator('#password')).toBeEnabled();
});

test('invalid controls do not replace the output', async ({ page }) => {
  await page.goto('./');
  await page.locator('#min-length').fill('0');
  await page.locator('#password').click();
  await expect(page.locator('#status')).toContainText('Minimum length');
  await expect(page.locator('#password')).toHaveText('Click to generate');
});
