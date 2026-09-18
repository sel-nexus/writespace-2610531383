import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostDetailPage from './PostDetailPage.jsx';
import PostEditor from './PostEditor.jsx';
import PostsPage from './PostsPage.jsx';

const mocks = vi.hoisted(() => ({
  api: { createPost: vi.fn(), deletePost: vi.fn(), getPost: vi.fn(), getPosts: vi.fn(), updatePost: vi.fn() },
  auth: { token: 'token', profile: { id: 'writer-id', username: 'writer', role: 'user' }, logout: vi.fn() },
}));
const { api } = mocks;
vi.mock('../../auth/AuthContext.jsx', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../api/client.js', () => mocks.api);

function LocationDisplay() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

function renderEditor(entry = '/posts/new') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/posts/new" element={<PostEditor />} />
        <Route path="/posts/:id/edit" element={<PostEditor />} />
        <Route path="/blog/:id" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderPostsPage() {
  return render(
    <MemoryRouter>
      <PostsPage />
    </MemoryRouter>,
  );
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
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    mocks.auth.profile = { id: 'writer-id', username: 'writer', role: 'user' };
    mocks.auth.logout.mockReset();
  });

  it('shows a writer only posts owned by the nested summary author', async () => {
    api.getPosts.mockResolvedValueOnce([
      { id: 'owned', title: 'My note', author: { id: 'writer-id', display_name: 'Writer Name', role: 'user' }, created_at: '2026-01-01T00:00:00Z' },
      { id: 'other', title: 'Another note', author: { id: 'other-id', display_name: 'Other Writer', role: 'user' }, created_at: '2026-01-02T00:00:00Z' },
    ]);
    renderPostsPage();

    expect(await screen.findByRole('heading', { name: 'My note' })).toBeVisible();
    expect(screen.getByText('By Writer Name')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Another note' })).not.toBeInTheDocument();
  });

  it('shows the empty state when a writer receives only another owners post', async () => {
    api.getPosts.mockResolvedValueOnce([
      { id: 'other', title: 'Another note', author: { id: 'other-id', display_name: 'Other Writer', role: 'user' }, created_at: '2026-01-02T00:00:00Z' },
    ]);
    renderPostsPage();

    expect(await screen.findByText('No posts yet. Begin with one clear thought.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Another note' })).not.toBeInTheDocument();
  });

  it('shows the empty state when the post response is not an array', async () => {
    api.getPosts.mockResolvedValueOnce({ posts: [] });
    renderPostsPage();

    expect(await screen.findByText('No posts yet. Begin with one clear thought.')).toBeVisible();
  });

  it('shows a feed error and retries successfully', async () => {
    const user = userEvent.setup();
    api.getPosts
      .mockRejectedValueOnce(new Error('Post feed unavailable.'))
      .mockResolvedValueOnce([]);
    renderPostsPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Post feed unavailable.');
    const retryButton = screen.getByRole('button', { name: 'Try again' });
    expect(retryButton).toBeVisible();
    await user.click(retryButton);

    expect(await screen.findByText('No posts yet. Begin with one clear thought.')).toBeVisible();
  });

  it('shows the default feed error message when a rejection has no message', async () => {
    api.getPosts.mockRejectedValueOnce({});
    renderPostsPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load posts.');
  });

  it('shows admins every post returned by the nested summary contract', async () => {
    mocks.auth.profile = { id: 'admin-id', username: 'admin', role: 'admin' };
    api.getPosts.mockResolvedValueOnce([
      { id: 'owned', title: 'My note', author: { id: 'writer-id', display_name: 'Writer Name', role: 'user' }, created_at: '2026-01-01T00:00:00Z' },
      { id: 'other', title: 'Another note', author: { id: 'other-id', display_name: 'Other Writer', role: 'user' }, created_at: '2026-01-02T00:00:00Z' },
    ]);
    renderPostsPage();

    expect(await screen.findByRole('heading', { name: 'My note' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Another note' })).toBeVisible();
    expect(screen.getByText('By Writer Name')).toBeVisible();
    expect(screen.getByText('By Other Writer')).toBeVisible();
  });

  it('blocks a blank editor submission accessibly', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Publish post' }));
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
    expect(api.createPost).not.toHaveBeenCalled();
  });

  it('creates a post and navigates to its backend-returned detail route', async () => {
    const user = userEvent.setup();
    api.createPost.mockResolvedValueOnce({ id: 'created-id' });
    renderEditor();

    await user.type(screen.getByLabelText('Title'), 'Created note');
    await user.type(screen.getByLabelText('Content'), 'Created body');
    await user.click(screen.getByRole('button', { name: 'Publish post' }));

    expect(api.createPost).toHaveBeenCalledWith({ title: 'Created note', content: 'Created body' }, 'token');
    expect(await screen.findByTestId('location')).toHaveTextContent('/blog/created-id');
  });

  it('shows loading then populates the edit form and saves an update', async () => {
    let resolvePost;
    api.getPost.mockReturnValueOnce(new Promise((resolve) => { resolvePost = resolve; }));
    const user = userEvent.setup();
    renderEditor('/posts/post-id/edit');

    expect(screen.getByRole('status')).toHaveTextContent('Loading your draft…');
    resolvePost({ title: 'Before', content: 'Original' });
    expect(await screen.findByDisplayValue('Before')).toBeVisible();

    api.updatePost.mockResolvedValueOnce({ id: 'post-id' });
    await user.clear(screen.getByLabelText('Content'));
    await user.type(screen.getByLabelText('Content'), 'After');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(api.updatePost).toHaveBeenCalledWith('post-id', { title: 'Before', content: 'After' }, 'token');
    expect(await screen.findByTestId('location')).toHaveTextContent('/blog/post-id');
  });

  it('displays load and save failures without losing the editable form', async () => {
    api.getPost.mockRejectedValueOnce(new Error('Draft unavailable.'));
    renderEditor('/posts/post-id/edit');
    expect(await screen.findByRole('alert')).toHaveTextContent('Draft unavailable.');

    const user = userEvent.setup();
    api.createPost.mockRejectedValueOnce(new Error('Save failed.'));
    renderEditor();
    await user.type(screen.getAllByLabelText('Title').at(-1), 'Retry note');
    await user.type(screen.getAllByLabelText('Content').at(-1), 'Retry body');
    await user.click(screen.getByRole('button', { name: 'Publish post' }));

    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent('Save failed.');
    expect(screen.getAllByDisplayValue('Retry note').at(-1)).toBeVisible();
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
