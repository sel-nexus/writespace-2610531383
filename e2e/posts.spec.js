const { test, expect } = require('../frontend/node_modules/@playwright/test');
const { captureBrowserErrors, registerWriter } = require('./support');

test('writer creates, reloads, edits, and confirms deletion of a post', async ({ page }) => {
  const assertClean = captureBrowserErrors(page);
  await page.goto('/');
  await page.getByLabel('Make room for words that want').getByRole('link', { name: 'Get Started' }).click();
  await registerWriter(page, Date.now());
  await expect(page.getByRole('heading', { name: 'Notes with room to breathe.' })).toBeVisible();
  await page.getByRole('link', { name: 'Write a post' }).click();
  await page.getByRole('button', { name: 'Publish post' }).click();
  await expect(page.getByText('Title is required.')).toBeVisible();
  await page.getByLabel('Title').fill('A real journey');
  await page.getByLabel('Content').fill('First plain-text version.');
  const [created] = await Promise.all([page.waitForResponse((response) => response.url().endsWith('/api/posts') && response.request().method() === 'POST'), page.getByRole('button', { name: 'Publish post' }).click()]);
  expect(created.status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'A real journey' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('First plain-text version.')).toBeVisible();
  await page.getByRole('link', { name: 'Edit post' }).click();
  await expect(page.getByLabel('Content')).toHaveValue('First plain-text version.');
  await page.getByLabel('Content').fill('Edited plain-text version.');
  const [updated] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/posts/') && response.request().method() === 'PUT'),
    page.getByRole('button', { name: 'Save changes' }).click(),
  ]);
  expect(updated.status()).toBe(200);
  await expect(page.getByText('Edited plain-text version.')).toBeVisible();
  await page.getByRole('button', { name: 'Delete post' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await page.screenshot({ path: 'e2e/screenshots/posts-after-delete.png' });
  assertClean();
});
