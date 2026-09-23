import { test, expect } from '@playwright/test';

test('history puts newest entries first, toggles individually, and disappears on refresh', async ({ page }) => {
  // History must work even when clipboard access fails.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText() { return Promise.reject(new Error('denied')); } } });
  });
  await page.goto('./');
  const entries = page.locator('#password-history li');
  await expect(entries).toHaveCount(0);
  await page.locator('#password').click();
  const firstPassword = await page.locator('#password').textContent();
  await expect(entries).toHaveCount(1);
  await expect(entries.first().locator('span')).toHaveText('••••••••');
  await entries.first().getByRole('button', { name: 'Show' }).click();
  await expect(entries.first().locator('span')).toHaveText(firstPassword);
  await entries.first().getByRole('button', { name: 'Hide' }).click();
  await expect(entries.first().locator('span')).toHaveText('••••••••');
  await page.locator('#password').click();
  const latestPassword = await page.locator('#password').textContent();
  await expect(entries).toHaveCount(2);
  await expect(entries.first().locator('span')).toHaveText('••••••••');
  await entries.first().getByRole('button', { name: 'Show' }).click();
  await expect(entries.first().locator('span')).toHaveText(latestPassword);
  await entries.nth(1).getByRole('button', { name: 'Show' }).click();
  await expect(entries.nth(1).locator('span')).toHaveText(firstPassword);
  await page.locator('#min-length').fill('0');
  await page.locator('#password').click();
  await expect(entries).toHaveCount(2);
  await page.reload();
  await expect(entries).toHaveCount(0);
});
