const { test, expect } = require('@playwright/test');

test('writer creates, edits, and confirms deletion of a post', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const username = `postwriter${Date.now()}`;
  await page.goto('http://127.0.0.1:5173/register');
  await page.getByLabel('Display name').fill('Post Journey Writer');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('CorrectHorseBattery9');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/blogs$/);

  await page.getByRole('link', { name: 'Write a post' }).click();
  await page.getByLabel('Title').fill('A real journey');
  await page.getByLabel('Content').fill('First plain-text version.');
  await page.getByRole('button', { name: 'Publish post' }).click();
  await expect(page.getByRole('heading', { name: 'A real journey' })).toBeVisible();

  await page.getByRole('link', { name: 'Edit post' }).click();
  await page.getByLabel('Content').fill('Edited plain-text version.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Edited plain-text version.')).toBeVisible();

  await page.getByRole('button', { name: 'Delete post' }).click();
  await expect(page.getByRole('dialog', { name: 'Delete this post?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Edited plain-text version.')).toBeVisible();
  await page.getByRole('button', { name: 'Delete post' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByText('A real journey')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
