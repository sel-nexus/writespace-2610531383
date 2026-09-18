const { test, expect } = require('../frontend/node_modules/@playwright/test');
const { captureBrowserErrors, registerWriter } = require('./support');

test('shows visible registration validation and reaches the backend-backed empty post list', async ({ page }) => {
  const assertClean = captureBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Get Started' }).first().click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toHaveText('Display name is required.');
  const username = await registerWriter(page, Date.now());
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByText(`@${username}`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notes with room to breathe.' })).toBeVisible();
  await expect(page.getByText('No posts yet. Begin with one clear thought.')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/identity-post-list.png' });
  assertClean();
});
