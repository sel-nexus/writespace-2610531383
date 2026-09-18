import PropTypes from 'prop-types';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AdminPage from './features/admin/AdminPage.jsx';
import AuthPage from './features/auth/AuthPage.jsx';
import LandingPage from './features/discovery/LandingPage.jsx';
import PostDetailPage from './features/posts/PostDetailPage.jsx';
import PostEditor from './features/posts/PostEditor.jsx';
import PostsPage from './features/posts/PostsPage.jsx';

/** Gate administration to authenticated administrators. */
function AdminRoute({ children }) {
  const { status, profile } = useAuth();

  if (status === 'restoring') {
    return <p className="route-status" role="status">Restoring your writing room…</p>;
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  if (profile.role !== 'admin') return <Navigate to="/blogs" replace />;
  return children;
}

AdminRoute.propTypes = { children: PropTypes.node.isRequired };

/** Render the authenticated dashboard and Administrator-only workspace link. */
function DashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <main className="page-shell auth-shell">
      <nav className="masthead" aria-label="WriteSpace">
        <Link className="wordmark" to="/">
          Write<span>Space</span>
        </Link>
        <button className="text-button" type="button" onClick={logout}>
          Log out
        </button>
      </nav>
      <section className="auth-card" aria-labelledby="dashboard-title">
        <p className="eyebrow">Your writing room</p>
        <h1 id="dashboard-title">Welcome, {profile.display_name}</h1>
        <p className="lede">@{profile.username} · {profile.role}</p>
        {profile.role === 'admin' && (
          <Link className="primary-button" to="/admin">
            Open administration
          </Link>
        )}
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
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/blogs" element={<ProtectedRoute><PostsPage /></ProtectedRoute>} />
          <Route path="/blog/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
          <Route path="/posts/new" element={<ProtectedRoute><PostEditor /></ProtectedRoute>} />
          <Route path="/posts/:id/edit" element={<ProtectedRoute><PostEditor /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
