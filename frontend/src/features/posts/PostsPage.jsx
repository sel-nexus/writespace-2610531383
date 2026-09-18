import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext.jsx';
import { getPosts } from '../../api/client.js';

/** Render the authenticated writer's newest-first post index. */
export default function PostsPage() {
  const { token, profile, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');

  const loadPosts = () => {
    setPhase('loading');
    setError('');
    getPosts(token)
      .then((response) => {
        setPosts(Array.isArray(response) ? response : []);
        setPhase('ready');
      })
      .catch((requestError) => {
        setError(requestError.message || 'Unable to load posts.');
        setPhase('error');
      });
  };

  useEffect(() => { loadPosts(); }, [token]);

  const visiblePosts = profile.role === 'admin'
    ? posts
    : posts.filter((post) => post.author.id === profile.id);

  return (
    <main className="page-shell posts-shell">
      <nav className="masthead" aria-label="WriteSpace">
        <Link className="wordmark" to="/">Write<span>Space</span></Link>
        <div className="posts-nav">
          <span>@{profile.username}</span>
          <button className="text-button" type="button" onClick={logout}>Log out</button>
        </div>
      </nav>
      <section className="posts-heading" aria-labelledby="posts-title">
        <div>
          <p className="eyebrow">Your writing room</p>
          <h1 id="posts-title">Notes with room to breathe.</h1>
        </div>
        <Link className="primary-button" to="/posts/new">Write a post</Link>
      </section>
      {phase === 'loading' && <p className="resource-status" role="status" aria-live="polite">Gathering your posts…</p>}
      {phase === 'error' && (
        <div className="resource-status resource-error" role="alert">
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={loadPosts}>Try again</button>
        </div>
      )}
      {phase === 'ready' && visiblePosts.length === 0 && (
        <p className="resource-status">No posts yet. Begin with one clear thought.</p>
      )}
      {phase === 'ready' && visiblePosts.length > 0 && (
        <div className="post-grid" aria-label="Your posts">
          {visiblePosts.map((post) => (
            <article className="post-preview" key={post.id}>
              <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString()}</time>
              <h2>{post.title}</h2>
              <p>By {post.author.display_name}</p>
              <Link className="preview-link" to={`/blog/${post.id}`}>Read the note <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
