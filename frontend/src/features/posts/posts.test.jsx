import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import PostDetailPage from './PostDetailPage.jsx';
import PostEditor from './PostEditor.jsx';

const mocks = vi.hoisted(() => ({
  api: { createPost: vi.fn(), deletePost: vi.fn(), getPost: vi.fn(), updatePost: vi.fn() },
  auth: { token: 'token', profile: { id: 'writer-id', role: 'user' } },
}));
const { api, auth } = mocks;
vi.mock('../../auth/AuthContext.jsx', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../api/client.js', () => mocks.api);

function renderEditor() {
  return render(<MemoryRouter><PostEditor /></MemoryRouter>);
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/blog/post-id']}>
      <Routes>
        <Route path="/blog/:id" element={<PostDetailPage />} />
        <Route path="/blogs" element={<p>Post index</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('post components', () => {
  it('blocks a blank editor submission accessibly', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Publish post' }));
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
    expect(api.createPost).not.toHaveBeenCalled();
  });

  it('requires confirmation before calling delete and permits cancellation', async () => {
    api.getPost.mockResolvedValueOnce({ id: 'post-id', title: 'A title', content: 'A body', author_id: 'writer-id', author_name: 'Writer', created_at: '2026-01-01T00:00:00Z' });
    const user = userEvent.setup();
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'A title' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Delete post' }));
    expect(screen.getByRole('dialog', { name: 'Delete this post?' })).toBeVisible();
    expect(api.deletePost).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.deletePost).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete post' }));
    api.deletePost.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(api.deletePost).toHaveBeenCalledWith('post-id', 'token');
  });
});
