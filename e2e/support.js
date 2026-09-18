const { expect } = require('../frontend/node_modules/@playwright/test');

function captureBrowserErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return () => expect(errors).toEqual([]);
}

async function registerWriter(page, suffix) {
  const username = `writer${suffix}`;
  await page.getByLabel('Display name').fill('E2E Writer');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('CorrectHorseBattery9');
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes('/api/auth/register') && candidate.request().method() === 'POST'),
    page.getByRole('button', { name: 'Create account' }).click(),
  ]);
  expect(response.status()).toBe(201);
  return username;
}

module.exports = { captureBrowserErrors, registerWriter };
