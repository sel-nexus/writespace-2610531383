import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { createUser, deleteUser, getAdminStats, getUsers } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const EMPTY_FORM = { display_name: '', username: '', password: '', role: 'user' };

/** Render the protected account-governance workspace for administrators. */
export default function AdminPage() {
  const { token, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [target, setTarget] = useState(null);

  const load = async () => {
    setPhase('loading');
    setError('');
    try {
      const [nextStats, nextUsers] = await Promise.all([getAdminStats(token), getUsers(token)]);
      setStats(nextStats);
      setUsers(nextUsers);
      setPhase('ready');
    } catch (requestError) {
      setError(requestError.message);
      setPhase('error');
    }
  };

  useEffect(() => { load(); }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const created = await createUser(form, token);
      setUsers((current) => [created, ...current]);
      setStats((current) => ({ ...current, user_count: current.user_count + 1 }));
      setForm(EMPTY_FORM);
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!target) return;
    try {
      await deleteUser(target.id, token);
      setUsers((current) => current.filter((user) => user.id !== target.id));
      setStats((current) => ({ ...current, user_count: current.user_count - 1 }));
      setTarget(null);
    } catch (requestError) {
      setError(requestError.message);
      setTarget(null);
    }
  };

  return (
    <main className="page-shell admin-shell">
      <nav className="masthead" aria-label="WriteSpace administration">
        <Link className="wordmark" to="/">Write<span>Space</span></Link>
        <div className="posts-nav">
          <Link className="nav-link" to="/blogs">Posts</Link>
          <button className="text-button" type="button" onClick={logout}>Log out</button>
        </div>
      </nav>
      <header className="admin-heading">
        <p className="eyebrow">Administration</p>
        <h1>Keep the writing room in order.</h1>
      </header>
      {phase === 'loading' && <p className="resource-status" role="status">Loading account governance…</p>}
      {phase === 'error' && <section className="resource-status resource-error" role="alert"><p>{error}</p><button className="secondary-button" type="button" onClick={load}>Retry</button></section>}
      {phase === 'ready' && <>
        <section className="admin-stats" aria-label="Workspace statistics">
          <Stat label="Accounts" value={stats.user_count} />
          <Stat label="Posts" value={stats.post_count} />
          <Stat label="Recent posts" value={stats.recent_post_count} />
        </section>
        <section className="admin-grid">
          <form className="editor-card post-form" onSubmit={submit} aria-label="Create account">
            <h2>Create account</h2>
            <label htmlFor="admin-display-name">Display name</label>
            <input id="admin-display-name" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} required />
            <label htmlFor="admin-username">Username</label>
            <input id="admin-username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" minLength="12" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            <label htmlFor="admin-role">Role</label>
            <select id="admin-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="user">Writer</option><option value="admin">Administrator</option></select>
            {formError && <p className="field-error" role="alert">{formError}</p>}
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create account'}</button>
          </form>
          <section className="admin-users" aria-labelledby="accounts-heading">
            <h2 id="accounts-heading">Accounts</h2>
            {users.length === 0 ? <p className="resource-status">No accounts yet.</p> : <ul className="user-list">{users.map((user) => <li key={user.id}><div><strong>{user.display_name}</strong><span>@{user.username} · {user.role}</span></div><button className="danger-button" type="button" onClick={() => setTarget(user)}>Remove</button></li>)}</ul>}
          </section>
        </section>
      </>}
      {target && <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-account-title"><h2 id="remove-account-title">Remove {target.display_name}?</h2><p>This keeps their posts and published attribution.</p><div className="post-actions"><button className="secondary-button" type="button" onClick={() => setTarget(null)}>Cancel</button><button className="danger-button" type="button" onClick={confirmDelete}>Confirm remove</button></div></section></div>}
    </main>
  );
}

function Stat({ label, value }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
Stat.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.number.isRequired };
