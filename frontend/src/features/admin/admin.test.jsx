import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import AdminPage from './AdminPage.jsx';

const mocks = vi.hoisted(() => ({ api: { getAdminStats: vi.fn(), getUsers: vi.fn(), createUser: vi.fn(), deleteUser: vi.fn() } }));
vi.mock('../../auth/AuthContext.jsx', () => ({ useAuth: () => ({ token: 'admin-token', logout: vi.fn() }) }));
vi.mock('../../api/client.js', () => mocks.api);

function renderPage() { return render(<MemoryRouter><AdminPage /></MemoryRouter>); }

describe('AdminPage', () => {
  it('renders backend statistics and creates an accessible account form', async () => {
    mocks.api.getAdminStats.mockResolvedValueOnce({ user_count: 2, post_count: 4, recent_post_count: 1 });
    mocks.api.getUsers.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Accounts' })).toBeVisible();
    expect(screen.getByText('4')).toBeVisible();
    await user.type(screen.getByLabelText('Display name'), 'New Writer');
    await user.type(screen.getByLabelText('Username'), 'newwriter');
    await user.type(screen.getByLabelText('Password'), 'CorrectHorseBattery9');
    mocks.api.createUser.mockResolvedValueOnce({ id: 'writer-id', display_name: 'New Writer', username: 'newwriter', role: 'user' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('@newwriter · user')).toBeVisible();
  });

  it('shows retry when the administrative API fails', async () => {
    mocks.api.getAdminStats.mockRejectedValueOnce(new Error('No access'));
    mocks.api.getUsers.mockRejectedValueOnce(new Error('No access'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('No access');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
