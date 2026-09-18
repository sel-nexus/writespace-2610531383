import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ApiError, getHealth } from './api/client.js';
import AuthPage from './features/auth/AuthPage.jsx';

/** Render the public foundation home within the authenticated application. */
function HomePage() {
  const [health, setHealth] = useState({ phase: 'loading', text: 'Checking the writing room…' });

  useEffect(() => {
    let active = true;

    getHealth()
      .then((response) => {
        if (active) {
          setHealth({ phase: 'ready', text: `Connected · API status: ${response.status}` });
        }
      })
      .catch((error) => {
        if (active) {
          const message = error instanceof ApiError ? error.message : 'Unable to check service status.';
          setHealth({ phase: 'error', text: message });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <nav className="masthead" aria-label="WriteSpace">
        <a className="wordmark" href="/" aria-label="WriteSpace home">
          Write<span>Space</span>
        </a>
        <span className="issue">Issue 01 · Foundation</span>
      </nav>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">A place to begin</p>
        <h1 id="page-title">A quiet room for writing.</h1>
        <p className="lede">
          WriteSpace is preparing a durable home for plain-text ideas,
          shaped for writers and readers rather than feeds.
        </p>
        <div className={`service-note ${health.phase}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {health.text}
        </div>
      </section>

      <footer className="footer-note">
        <span>Slow words. Durable pages.</span>
        <span>© WriteSpace</span>
      </footer>
    </main>
  );
}

/** Render an intentionally small protected dashboard placeholder. */
function DashboardPage() {
  const { profile, logout } = useAuth();
  return (
    <main className="page-shell auth-shell">
      <nav className="masthead" aria-label="WriteSpace">
        <Link className="wordmark" to="/">Write<span>Space</span></Link>
        <button className="text-button" type="button" onClick={logout}>Log out</button>
      </nav>
      <section className="auth-card" aria-labelledby="dashboard-title">
        <p className="eyebrow">Your writing room</p>
        <h1 id="dashboard-title">Welcome, {profile.display_name}</h1>
        <p className="lede">@{profile.username} · {profile.role}</p>
      </section>
    </main>
  );
}

/** Render the application with one browser router and identity routes. */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/blogs" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
