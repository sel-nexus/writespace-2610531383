import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import AuthPage from './AuthPage.jsx';

const auth = { login: vi.fn(), register: vi.fn() };
vi.mock('../../auth/AuthContext.jsx', () => ({ useAuth: () => auth }));

function renderPage() {
  return render(<MemoryRouter><AuthPage mode="register" /></MemoryRouter>);
}

describe('AuthPage', () => {
  it('blocks an invalid registration before submission', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Display name is required.');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('submits valid registration details and shows loading state', async () => {
    const user = userEvent.setup();
    let resolveRequest;
    auth.register.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
    renderPage();

    await user.type(screen.getByLabelText('Display name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password'), 'CorrectHorseBattery9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(auth.register).toHaveBeenCalledWith({ display_name: 'Ada Lovelace', username: 'ada', password: 'CorrectHorseBattery9' });
    expect(screen.getByRole('button', { name: 'Opening your room…' })).toBeDisabled();
    resolveRequest({ role: 'user' });
  });
});
