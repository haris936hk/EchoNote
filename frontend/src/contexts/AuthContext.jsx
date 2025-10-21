import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProviderInner = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.error('Failed to parse user data:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Login with Google ID token (from Google Sign-In button)
  const loginWithGoogle = useCallback(async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);

      // Send ID token to backend
      const { data } = await axios.post('http://localhost:5000/api/auth/google', {
        idToken: credentialResponse.credential
      });

      // Store tokens and user data
      localStorage.setItem('token', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;

      setUser(data.data.user);
      setLoading(false);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.error || 'Login failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProvider = ({ children }) => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </GoogleOAuthProvider>
  );
};
