import { useEffect, useState } from 'react';

import { ApiError, getHealth } from './api/client.js';

/** Render the small, backend-connected WriteSpace foundation page. */
export default function App() {
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
