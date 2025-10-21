import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Custom hook to access authentication context
 * Provides user data, authentication status, and auth methods
 * 
 * @throws {Error} If used outside of AuthProvider
 * @returns {Object} Authentication context value
 */
const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider> to use this hook.'
    );
  }

  return context;
};

export default useAuth;

/**
 * Hook to check if user has specific permissions (for future use)
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    if (!user) return false;
    // Add your permission logic here
    return true;
  };

  const hasRole = (role) => {
    if (!user) return false;
    // Add your role checking logic here
    return user.role === role;
  };

  return {
    hasPermission,
    hasRole
  };
};

/**
 * Hook to check authentication status with loading state
 */
export const useAuthStatus = () => {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user
  };
};

/**
 * Hook for protected routes - redirects if not authenticated
 */
export const useRequireAuth = (redirectUrl = '/login') => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectUrl);
    }
  }, [user, loading, navigate, redirectUrl]);

  return { user, loading };
};