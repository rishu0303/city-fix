import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient.js';
import { AuthContext } from './authContextValue.js';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('cityfix_token'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('cityfix_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    const hydrateUser = async () => {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const { data } = await apiClient.get('/auth/me');
        setUser(data.user);
        localStorage.setItem('cityfix_user', JSON.stringify(data.user));
      } catch {
        localStorage.removeItem('cityfix_token');
        localStorage.removeItem('cityfix_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    hydrateUser();
  }, [token]);

  const persistSession = (payload) => {
    localStorage.setItem('cityfix_token', payload.token);
    localStorage.setItem('cityfix_user', JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  };

  const login = useCallback(async ({ email, password }) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    persistSession(data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    persistSession(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cityfix_token');
    localStorage.removeItem('cityfix_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isBootstrapping,
    login,
    register,
    logout
  }), [token, user, isBootstrapping, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
