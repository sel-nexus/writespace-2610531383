import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AuthPage from './AuthPage.jsx';

const auth = { login: vi.fn(), register: vi.fn() };
vi.mock('../../auth/AuthContext.jsx', () => ({ useAuth: () => auth }));

function LocationDisplay() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/blogs" element={<><h1>Notes with room to breathe.</h1><LocationDisplay /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthPage', () => {
  beforeEach(() => {
    auth.login.mockReset();
    auth.register.mockReset();
  });

  it('blocks an invalid registration before submission', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Display name is required.');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('shows a visible error when the username is left blank', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Display name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Password'), 'CorrectHorseBattery9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/username is required/i);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('shows a visible error for an invalid registration username', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Display name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Username'), 'ada!');
    await user.type(screen.getByLabelText('Password'), 'CorrectHorseBattery9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/username/i);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('shows a visible error for a short registration password', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Display name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/password/i);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('shows a rejected auth request error and restores the submit button', async () => {
    const user = userEvent.setup();
    auth.register.mockRejectedValueOnce(new Error('That username is already taken.'));
    renderPage();

    await user.type(screen.getByLabelText('Display name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password'), 'CorrectHorseBattery9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That username is already taken.');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('resolves registration and navigates writers to their visible post index', async () => {
    const user = userEvent.setup();
    auth.register.mockResolvedValueOnce({ role: 'user' });
    renderPage();

    await user.type(screen.getByLabelText('Display name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password'), 'CorrectHorseBattery9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(auth.register).toHaveBeenCalledWith({
      display_name: 'Ada Lovelace',
      username: 'ada',
      password: 'CorrectHorseBattery9',
    });
    expect(await screen.findByRole('heading', { name: 'Notes with room to breathe.' })).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('/blogs');
  });
});
