import { test, expect } from '@playwright/test';

test('recent password rows copy before show and keep the password on the right', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.locator('#generate').click();
  const password = await page.locator('#password').inputValue();
  await page.locator('#generate').click();
  const entry = page.locator('#password-history li').first();
  await expect(entry.locator('button').nth(0)).toHaveText('Copy');
  await expect(entry.locator('button').nth(1)).toHaveText('Show');
  await expect(entry.locator('span')).toHaveText('••••••••');
  await entry.getByRole('button', { name: 'Copy' }).click();
  await expect(page.locator('#status')).toContainText('Recent password copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(password);
  await entry.getByRole('button', { name: 'Show' }).click();
  await expect(entry.locator('span')).toHaveText(password);
});

test('recent passwords put newest archived entries first, cap at 10, and disappear on refresh', async ({ page }) => {
  // History must work even when clipboard access fails.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText() { return Promise.reject(new Error('denied')); } } });
  });
  await page.goto('./');
  const entries = page.locator('#password-history li');
  await expect(entries).toHaveCount(0);
  await page.locator('#generate').click();
  const firstPassword = await page.locator('#password').inputValue();
  await expect(entries).toHaveCount(0);
  await page.locator('#generate').click();
  const secondPassword = await page.locator('#password').inputValue();
  await expect(entries).toHaveCount(1);
  await expect(entries.first().locator('span')).toHaveText('••••••••');
  await entries.first().getByRole('button', { name: 'Show' }).click();
  await expect(entries.first().locator('span')).toHaveText(firstPassword);
  await entries.first().getByRole('button', { name: 'Hide' }).click();
  await expect(entries.first().locator('span')).toHaveText('••••••••');
  await page.locator('#generate').click();
  await expect(entries).toHaveCount(2);
  await expect(entries.first().locator('span')).toHaveText('••••••••');
  await entries.first().getByRole('button', { name: 'Show' }).click();
  await expect(entries.first().locator('span')).toHaveText(secondPassword);
  await entries.nth(1).getByRole('button', { name: 'Show' }).click();
  await expect(entries.nth(1).locator('span')).toHaveText(firstPassword);
  for (let i = 0; i < 10; i += 1) await page.locator('#generate').click();
  await expect(entries).toHaveCount(10);
  await page.locator('summary').click();
  await page.locator('#min-length').fill('0');
  await page.locator('#generate').click();
  await expect(entries).toHaveCount(10);
  await page.reload();
  await expect(entries).toHaveCount(0);
});

test('active password expires into recent passwords after ten seconds', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-24T12:00:00Z') });
  await page.goto('./');
  await page.locator('#generate').click();
  const password = await page.locator('#password').inputValue();
  await expect(page.locator('#expiry')).toHaveText('Moves to recent passwords in 10 seconds.');
  await page.clock.fastForward(1000);
  await expect(page.locator('#expiry')).toHaveText('Moves to recent passwords in 9 seconds.');
  await expect(page.locator('#password-history li')).toHaveCount(0);
  await page.clock.fastForward(9000);
  await expect(page.locator('#password')).toHaveValue('');
  await expect(page.locator('#copy')).toBeDisabled();
  await expect(page.locator('#status')).toContainText('Moved to recent passwords');
  const entry = page.locator('#password-history li').first();
  await expect(entry).toHaveCount(1);
  await entry.getByRole('button', { name: 'Show' }).click();
  await expect(entry.locator('span')).toHaveText(password);
});
