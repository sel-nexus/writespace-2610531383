import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AuthPage from './features/auth/AuthPage.jsx';
import LandingPage from './features/discovery/LandingPage.jsx';

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/blogs" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
