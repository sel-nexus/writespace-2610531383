const { test, expect } = require('@playwright/test');

test('registers a unique writer and renders the backend-derived profile', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const username = `writer${Date.now()}`;
  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Display name').fill('E2E Writer');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('CorrectHorseBattery9');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole('heading', { name: 'Welcome, E2E Writer' })).toBeVisible();
  await expect(page.getByText(`@${username}`)).toBeVisible();
  expect(consoleErrors).toEqual([]);
});