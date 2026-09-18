const { test, expect } = require('@playwright/test');

test('renders a backend-created public title without its body and offers guest CTAs', async ({ page, request }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const username = `discovery${Date.now()}`;
  const registration = await request.post('http://127.0.0.1:8000/api/auth/register', {
    data: { display_name: 'Discovery Writer', username, password: 'CorrectHorseBattery9' },
  });
  const { access_token: token } = await registration.json();
  const title = `Public title ${Date.now()}`;
  const privateBody = `Opening excerpt. ${'private detail '.repeat(100)}`;
  const post = await request.post('http://127.0.0.1:8000/api/posts', {
    headers: { Authorization: `Bearer ${token}` },
    data: { title, content: privateBody },
  });
  expect(post.ok()).toBeTruthy();

  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText(privateBody)).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Start Reading' })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Get Started' }).first()).toHaveAttribute('href', '/register');
  expect(consoleErrors).toEqual([]);
});