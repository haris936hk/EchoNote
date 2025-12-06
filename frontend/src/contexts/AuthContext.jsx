import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Helper function to fetch fresh user data from backend
  const fetchFreshUserData = useCallback(async () => {
    try {
      console.log('[Auth] Fetching fresh user data from /auth/me...');
      const { data } = await api.get('/auth/me');
      if (data.success && data.data.user) {
        console.log('[Auth] Fresh user data fetched:', data.data.user);
        console.log('[Auth] User picture:', data.data.user.picture);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setUser(data.data.user);
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch fresh user data:', error);
    }
  }, []);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('[Auth] Loaded user from localStorage:', parsedUser);
        console.log('[Auth] User has picture?', !!parsedUser.picture);
        console.log('[Auth] Picture URL:', parsedUser.picture);

        setUser(parsedUser);
        // Note: Authorization header is handled by api.js interceptor

        // Migration: If user data doesn't have picture field, fetch fresh user data
        if (!parsedUser.picture) {
          console.log('[Auth] ⚠️ User data missing picture field, fetching fresh data...');
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

  // Login with Google ID token (from Google Sign-In button)
  const loginWithGoogle = useCallback(async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Auth] Starting Google login with credential:', {
        hasCredential: !!credentialResponse.credential,
        credentialLength: credentialResponse.credential?.length
      });

      // Send ID token to backend
      const { data } = await api.post('/auth/google', {
        idToken: credentialResponse.credential
      });

      console.log('[Auth] Backend response received:', {
        hasData: !!data,
        hasUser: !!data?.data?.user,
        hasToken: !!data?.data?.accessToken,
        hasPicture: !!data?.data?.user?.picture
      });

      console.log('[Auth] Full user object from backend:', data.data.user);

      // Store tokens and user data
      localStorage.setItem('token', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      // Note: Authorization header is handled by api.js interceptor

      console.log('[Auth] Login successful:', {
        user: data.data.user.email,
        picture: data.data.user.picture,
        tokenLength: data.data.accessToken.length,
        hasRefreshToken: !!data.data.refreshToken
      });

      setUser(data.data.user);
      setLoading(false);

      return { success: true };
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      console.error('[Auth] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(() => {
    console.log('[Auth] Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // Note: Authorization header is handled by api.js interceptor
    setUser(null);
    setError(null);
  }, []);

  const refreshUserData = useCallback(async () => {
    console.log('[Auth] Manually refreshing user data...');
    await fetchFreshUserData();
  }, [fetchFreshUserData]);

  const value = {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    refreshUserData,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
