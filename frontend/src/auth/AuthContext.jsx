import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { ApiError, requestJson } from '../api/client.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'writespace.token';
const PROFILE_KEY = 'writespace.profile';

/** Provide the backend-authoritative WriteSpace session to the application. */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'restoring', token: null, profile: null });

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setState({ status: 'anonymous', token: null, profile: null });
  };

  const saveSession = (response) => {
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(response.profile));
    setState({ status: 'authenticated', token: response.access_token, profile: response.profile });
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState({ status: 'anonymous', token: null, profile: null });
      return;
    }

    requestJson('/api/auth/me', { token })
      .then((profile) => {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        setState({ status: 'authenticated', token, profile });
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) clearSession();
        else setState({ status: 'anonymous', token: null, profile: null });
      });
  }, []);

  const value = useMemo(() => ({
    ...state,
    login: async (credentials) => {
      const response = await requestJson('/api/auth/login', { method: 'POST', body: credentials });
      saveSession(response);
      return response.profile;
    },
    register: async (registration) => {
      const response = await requestJson('/api/auth/register', { method: 'POST', body: registration });
      saveSession(response);
      return response.profile;
    },
    logout: clearSession,
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };

/** Read the current WriteSpace authentication state. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
