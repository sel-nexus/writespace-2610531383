const { test, expect } = require('../frontend/node_modules/@playwright/test');
const { captureBrowserErrors } = require('./support');

test('shows backend health, current landing heading, and mobile layout', async ({ page }) => {
  const assertClean = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/health'));
  await page.goto('/');
  expect((await responsePromise).ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Make room for words that want to stay.' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Connected · API status: ok');
  await page.screenshot({ path: 'e2e/screenshots/foundation-mobile.png' });
  assertClean();
});

test('redirects anonymous visitors from protected post routes', async ({ page }) => {
  const assertClean = captureBrowserErrors(page);
  await page.goto('/posts/new');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Return to the room.' })).toBeVisible();
  assertClean();
});
