const { test, expect } = require('@playwright/test');

test('shows the backend-derived WriteSpace health response', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('status')).toHaveText('Connected · API status: ok');
  await expect(page.getByRole('heading', { name: 'A quiet room for writing.' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
