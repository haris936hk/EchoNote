import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Custom hook to access authentication context
 * Provides user data, authentication status, and auth methods
 *
 * @throws {Error} 
 * @returns {Object} 
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


export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    if (!user) return false;
    return true;
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  return {
    hasPermission,
    hasRole,
  };
};


export const useAuthStatus = () => {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
  };
};


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
