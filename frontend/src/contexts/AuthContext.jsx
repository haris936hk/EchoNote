import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFreshUserData = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success && data.data.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setUser(data.data.user);
      }
    } catch (err) {
      console.error('[Auth] Failed to fetch fresh user data:', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (!parsedUser.picture) {
          fetchFreshUserData();
        }
      } catch (err) {
        console.error('Failed to parse user data:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, [fetchFreshUserData]);

  const loginWithGoogle = useCallback(async (codeResponse) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.post('/auth/google', {
        code: codeResponse.code,
      });

      localStorage.setItem('token', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      setUser(data.data.user);
      setLoading(false);

      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || 'Login failed';
      console.error('[Auth] Login failed:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  }, []);

  const refreshUserData = useCallback(async () => {
    await fetchFreshUserData();
  }, [fetchFreshUserData]);

  const value = {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    refreshUserData,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
