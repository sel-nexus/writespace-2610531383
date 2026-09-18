const { test, expect } = require('@playwright/test');

test('administrator observes stats, creates, and removes an eligible account', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  const username = `managed${Date.now()}`;

  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.goto('http://127.0.0.1:5173/admin');
  await expect(page.getByRole('heading', { name: 'Keep the writing room in order.' })).toBeVisible();
  await expect(page.getByText('Accounts')).toBeVisible();

  await page.getByLabel('Display name').fill('Eligible Writer');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('CorrectHorseBattery9');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(`@${username} · user`)).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).last().click();
  await expect(page.getByRole('dialog', { name: 'Remove Eligible Writer?' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm remove' }).click();
  await expect(page.getByText(`@${username} · user`)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
