import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deletePost, getPost } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

/** Render a full post and a deliberate, cancellable delete confirmation. */
export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, profile } = useAuth();
  const [post, setPost] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTrigger = useRef(null);

  useEffect(() => {
    setPhase('loading');
    getPost(id, token)
      .then((response) => { setPost(response); setPhase('ready'); })
      .catch((requestError) => { setError(requestError.message || 'Unable to load this post.'); setPhase('error'); });
  }, [id, token]);

  const canMutate = post && (profile.role === 'admin' || profile.id === post.author_id);
  const closeDialog = () => {
    setConfirming(false);
    deleteTrigger.current?.focus();
  };
  const confirmDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await deletePost(id, token);
      navigate('/blogs');
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete this post.');
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <main className="page-shell post-detail-shell">
      <nav className="masthead" aria-label="WriteSpace"><Link className="wordmark" to="/">Write<span>Space</span></Link><Link className="text-button" to="/blogs">All posts</Link></nav>
      {phase === 'loading' && <p className="resource-status" role="status">Opening the note…</p>}
      {phase === 'error' && <p className="resource-status resource-error" role="alert">{error}</p>}
      {phase === 'ready' && post && (
        <article className="post-detail">
          <p className="eyebrow">{post.author_name} · {new Date(post.created_at).toLocaleDateString()}</p>
          <h1>{post.title}</h1>
          <div className="post-content">{post.content}</div>
          {canMutate && (
            <div className="post-actions">
              <Link className="secondary-button" to={`/posts/${post.id}/edit`}>Edit post</Link>
              <button ref={deleteTrigger} className="danger-button" type="button" onClick={() => setConfirming(true)}>Delete post</button>
            </div>
          )}
        </article>
      )}
      {confirming && (
        <div className="dialog-backdrop" onMouseDown={closeDialog}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Permanent action</p>
            <h2 id="delete-title">Delete this post?</h2>
            <p>This cannot be undone.</p>
            <div className="post-actions">
              <button className="secondary-button" type="button" onClick={closeDialog} disabled={deleting}>Cancel</button>
              <button className="danger-button" type="button" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Confirm delete'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
