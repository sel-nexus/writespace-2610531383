import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext.jsx';

/** Render a warm, accessible login or registration form. */
export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [values, setValues] = useState({ display_name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (event) => setValues({ ...values, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (isRegister && !values.display_name.trim()) return setError('Display name is required.');
    if (!values.username.trim()) return setError('Username is required.');
    if (isRegister && !/^[A-Za-z0-9_.-]+$/.test(values.username.trim())) return setError('Username may use letters, numbers, dots, underscores, and hyphens only.');
    if (values.password.length < (isRegister ? 12 : 1)) return setError(isRegister ? 'Password must be at least 12 characters.' : 'Password is required.');
    setLoading(true);
    try {
      const profile = isRegister ? await register(values) : await login({ username: values.username, password: values.password });
      navigate(profile.role === 'admin' ? '/admin' : '/blogs', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to continue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell auth-shell">
      <nav className="masthead" aria-label="WriteSpace">
        <Link className="wordmark" to="/">Write<span>Space</span></Link>
        <span className="issue">Issue 02 · Identity</span>
      </nav>
      <section
        className="auth-card"
        aria-labelledby="auth-title"
        style={{
          width: 'min(560px, 100%)',
          margin: 'auto',
          padding: 'clamp(1.75rem, 5vw, 3.5rem)',
          border: '1px solid #d9c7b3',
          borderRadius: '1.25rem',
          background: 'rgb(255 251 244 / 82%)',
          boxShadow: '0 24px 54px rgb(78 52 34 / 12%)',
        }}
      >
        <p className="eyebrow">{isRegister ? 'A place of your own' : 'Welcome back'}</p>
        <h1 id="auth-title">{isRegister ? 'Begin your first draft.' : 'Return to the room.'}</h1>
        <form onSubmit={submit} noValidate style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
          {isRegister && <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 700 }}>Display name<input name="display_name" value={values.display_name} onChange={update} autoComplete="name" aria-required="true" /></label>}
          <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 700 }}>Username<input name="username" value={values.username} onChange={update} autoComplete="username" aria-required="true" /></label>
          <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 700 }}>Password<input name="password" type="password" value={values.password} onChange={update} autoComplete={isRegister ? 'new-password' : 'current-password'} aria-required="true" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading} style={{ minHeight: '3rem', border: 0, borderRadius: '999px', background: '#b75635', color: '#fffaf3', cursor: loading ? 'wait' : 'pointer', fontWeight: 800 }}>{loading ? 'Opening your room…' : isRegister ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{isRegister ? 'Already writing here? ' : 'New to WriteSpace? '}<Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
      </section>
    </main>
  );
}

AuthPage.propTypes = {
  mode: PropTypes.oneOf(['login', 'register']).isRequired,
};
