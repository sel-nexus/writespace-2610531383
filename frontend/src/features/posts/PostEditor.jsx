import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createPost, getPost, updatePost } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

/** Create or edit a plain-text post with client-side accessible validation. */
export default function PostEditor() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();
  const [values, setValues] = useState({ title: '', content: '' });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState(isEditing ? 'loading' : 'ready');
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    getPost(id, token)
      .then((post) => { setValues({ title: post.title, content: post.content }); setPhase('ready'); })
      .catch((error) => { setRequestError(error.message || 'Unable to load this post.'); setPhase('error'); });
  }, [id, isEditing, token]);

  const updateValue = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    const title = values.title.trim();
    const content = values.content.trim();
    const nextErrors = {};
    if (!title) nextErrors.title = 'Title is required.';
    else if (title.length > 200) nextErrors.title = 'Title must be 200 characters or fewer.';
    if (!content) nextErrors.content = 'Content is required.';
    else if (content.length > 10000) nextErrors.content = 'Content must be 10,000 characters or fewer.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPhase('saving');
    setRequestError('');
    try {
      const post = isEditing ? await updatePost(id, { title, content }, token) : await createPost({ title, content }, token);
      navigate(`/blog/${post.id}`);
    } catch (error) {
      setRequestError(error.message || 'Unable to save this post.');
      setPhase('ready');
    }
  };

  return (
    <main className="page-shell editor-shell">
      <nav className="masthead" aria-label="WriteSpace"><Link className="wordmark" to="/">Write<span>Space</span></Link><Link className="text-button" to="/blogs">Cancel</Link></nav>
      <section className="editor-card" aria-labelledby="editor-title">
        <p className="eyebrow">{isEditing ? 'Revise your note' : 'A blank page'}</p>
        <h1 id="editor-title">{isEditing ? 'Edit post' : 'Write a post'}</h1>
        {phase === 'loading' && <p role="status">Loading your draft…</p>}
        {phase === 'error' && <p className="resource-status resource-error" role="alert">{requestError}</p>}
        {phase !== 'loading' && phase !== 'error' && (
          <form className="post-form" onSubmit={submit} noValidate>
            <label htmlFor="post-title">Title</label>
            <input id="post-title" name="title" value={values.title} onChange={updateValue} maxLength="200" required aria-required="true" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} />
            {errors.title && <p id="title-error" className="field-error" role="alert">{errors.title}</p>}
            <label htmlFor="post-content">Content</label>
            <textarea id="post-content" name="content" value={values.content} onChange={updateValue} maxLength="10000" required aria-required="true" aria-invalid={Boolean(errors.content)} aria-describedby={errors.content ? 'content-error' : undefined} rows="14" />
            {errors.content && <p id="content-error" className="field-error" role="alert">{errors.content}</p>}
            {requestError && <p className="field-error" role="alert">{requestError}</p>}
            <button className="primary-button" type="submit" disabled={phase === 'saving'}>{phase === 'saving' ? 'Saving…' : isEditing ? 'Save changes' : 'Publish post'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
