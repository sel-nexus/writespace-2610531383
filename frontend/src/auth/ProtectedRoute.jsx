import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

import { useAuth } from './AuthContext.jsx';

/** Guard a route until session restoration completes. */
export default function ProtectedRoute({ children }) {
  const { status } = useAuth();

  if (status === 'restoring') {
    return <p className="route-status" role="status">Restoring your writing room…</p>;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
