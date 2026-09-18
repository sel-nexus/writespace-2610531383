import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext.jsx';
import { ApiError, getHealth, getPublicPosts } from '../../api/client.js';
import RecentPosts from './RecentPosts.jsx';

/** Render the public WriteSpace landing and bounded reading discovery feed. */
export default function LandingPage() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const [health, setHealth] = useState({ phase: 'loading', text: 'Checking the writing room…' });

  useEffect(() => {
    let active = true;
    getHealth()
      .then((response) => {
        if (active) setHealth({ phase: 'ready', text: `Connected · API status: ${response.status}` });
      })
      .catch((error) => {
        if (active) setHealth({ phase: 'error', text: error instanceof ApiError ? error.message : 'Unable to check service status.' });
      });
    return () => { active = false; };
  }, []);

  const selectPreview = (id) => {
    navigate(status === 'authenticated' ? `/blog/${id}` : '/login');
  };
  const loadRecentPosts = useCallback(() => getPublicPosts(3), []);

  return (
    <main className="page-shell landing-shell">
      <nav className="masthead" aria-label="WriteSpace">
        <Link className="wordmark" to="/" aria-label="WriteSpace home">Write<span>Space</span></Link>
        <div className="landing-nav">
          <Link className="nav-link" to="/login">Login</Link>
          <Link className="nav-cta" to="/register">Get Started</Link>
        </div>
      </nav>

      <section className="hero landing-hero" aria-labelledby="page-title">
        <p className="eyebrow">The independent reading room</p>
        <h1 id="page-title">Make room for words that want to stay.</h1>
        <p className="lede">A slower shelf for plain-text writing—made for beginning, returning, and following an idea to its quiet conclusion.</p>
        <div className="hero-actions">
          <Link className="primary-button" to="/register">Get Started</Link>
          <Link className="secondary-button" to="/login">Start Reading</Link>
        </div>
        <div className={`service-note ${health.phase}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {health.text}
        </div>
      </section>

      <RecentPosts loader={loadRecentPosts} onSelect={selectPreview} />

      <footer className="footer-note">
        <span>Slow words. Durable pages.</span>
        <span>© WriteSpace</span>
      </footer>
    </main>
  );
}
