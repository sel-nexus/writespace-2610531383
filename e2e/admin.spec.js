const { test, expect } = require('../frontend/node_modules/@playwright/test');
const { captureBrowserErrors } = require('./support');

test('administrator clicks visible dashboard link to manage an eligible account', async ({ page }) => {
  const assertClean = captureBrowserErrors(page);
  const username = `managed${Date.now()}`;
  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  const [login] = await Promise.all([page.waitForResponse((response) => response.url().includes('/api/auth/login')), page.getByRole('button', { name: 'Sign in' }).click()]);
  expect(login.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Open administration' }).click();
  await expect(page.getByRole('heading', { name: 'Keep the writing room in order.' })).toBeVisible();
  await expect(page.getByText('Posts').last()).toHaveText('Posts');
  await expect(page.getByLabel('Workspace statistics')).toContainText('0');
  await page.getByLabel('Display name').fill('Eligible Writer');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('CorrectHorseBattery9');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(`@${username} · user`)).toBeVisible();
  const managedAccount = page.locator('li').filter({ hasText: `@${username} · user` });
  await managedAccount.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('button', { name: 'Confirm remove' }).click();
  await expect(page.getByText(`@${username} · user`)).toHaveCount(0);
  await page.screenshot({ path: 'e2e/screenshots/admin-dashboard.png' });
  assertClean();
});
