import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LandingPage from './LandingPage.jsx';

const auth = { status: 'anonymous' };
const api = { getHealth: vi.fn(), getPublicPosts: vi.fn() };
vi.mock('../../auth/AuthContext.jsx', () => ({ useAuth: () => auth }));
vi.mock('../../api/client.js', () => ({
  ApiError: class ApiError extends Error {},
  getHealth: (...args) => api.getHealth(...args),
  getPublicPosts: (...args) => api.getPublicPosts(...args),
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<p>Login destination</p>} />
        <Route path="/blog/:id" element={<p>Post destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('discovery landing', () => {
  beforeEach(() => {
    auth.status = 'anonymous';
    api.getHealth.mockReset();
    api.getPublicPosts.mockReset();
  });

  it('renders three safe post summaries from a successful public response', async () => {
    api.getHealth.mockResolvedValue({ status: 'ok' });
    api.getPublicPosts.mockResolvedValue([
      { id: 'new', title: 'Newest note', excerpt: 'A thoughtful beginning.', created_at: '2026-09-18T10:00:00Z' },
      { id: 'middle', title: 'Middle note', excerpt: 'A considered middle.', created_at: '2026-09-17T10:00:00Z' },
      { id: 'old', title: 'Older note', excerpt: 'A durable ending.', created_at: '2026-09-16T10:00:00Z' },
      { id: 'hidden', title: 'Hidden fourth', excerpt: 'Not shown.', created_at: '2026-09-15T10:00:00Z' },
    ]);
    renderLanding();

    expect(await screen.findByText('Newest note')).toBeVisible();
    expect(screen.getByText('Middle note')).toBeVisible();
    expect(screen.getByText('Older note')).toBeVisible();
    expect(screen.queryByText('Hidden fourth')).not.toBeInTheDocument();
    expect(screen.queryByText('A complete private body')).not.toBeInTheDocument();
  });

  it('shows empty state and lets a failed initial request retry', async () => {
    const user = userEvent.setup();
    api.getHealth.mockResolvedValue({ status: 'ok' });
    api.getPublicPosts.mockResolvedValueOnce([]);
    renderLanding();
    expect(await screen.findByText('No notes have been published yet. Please return soon.')).toBeVisible();

    api.getPublicPosts.mockRejectedValueOnce(new Error('Feed unavailable'));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Feed unavailable');
    expect(screen.getByText('No notes have been published yet. Please return soon.')).toBeVisible();
  });

  it('retries an initial error and sends guest preview selection to login', async () => {
    const user = userEvent.setup();
    api.getHealth.mockResolvedValue({ status: 'ok' });
    api.getPublicPosts.mockRejectedValueOnce(new Error('Feed unavailable')).mockResolvedValueOnce([
      { id: 'note-1', title: 'Retried note', excerpt: 'Back on the shelf.', created_at: '2026-09-18T10:00:00Z' },
    ]);
    renderLanding();

    expect(await screen.findByRole('alert')).toHaveTextContent('Feed unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Retried note')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Read Retried note' }));
    expect(screen.getByText('Login destination')).toBeVisible();
  });
});
