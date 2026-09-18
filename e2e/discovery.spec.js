const { test, expect } = require('../frontend/node_modules/@playwright/test');
const { captureBrowserErrors } = require('./support');

test('renders a backend-created public title without its private body', async ({ page, request }) => {
  const assertClean = captureBrowserErrors(page);
  const username = `discovery${Date.now()}`;
  const registration = await request.post('http://127.0.0.1:8000/api/auth/register', { data: { display_name: 'Discovery Writer', username, password: 'CorrectHorseBattery9' } });
  expect(registration.status()).toBe(201);
  const { access_token: token } = await registration.json();
  const title = `Public title ${Date.now()}`;
  const privateBody = `Opening excerpt. ${'private detail '.repeat(100)}`;
  const post = await request.post('http://127.0.0.1:8000/api/posts', { headers: { Authorization: `Bearer ${token}` }, data: { title, content: privateBody } });
  expect(post.status()).toBe(201);
  const feedResponse = page.waitForResponse((response) => response.url().includes('/api/public/posts'));
  await page.goto('/');
  expect((await feedResponse).ok()).toBeTruthy();
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText(privateBody)).not.toBeVisible();
  assertClean();
});
