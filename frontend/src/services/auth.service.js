import { authAPI } from './api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Save authentication token to localStorage
 */
export const saveToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('Failed to save token:', error);
    return false;
  }
};

/**
 * Get authentication token from localStorage
 */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
};

/**
 * Remove authentication token from localStorage
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Failed to remove token:', error);
    return false;
  }
};

/**
 * Check if user has valid token
 */
export const hasToken = () => {
  return !!getToken();
};

// ============================================
// USER SESSION MANAGEMENT
// ============================================

/**
 * Save user data to localStorage
 */
export const saveUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Failed to save user:', error);
    return false;
  }
};

/**
 * Get user data from localStorage
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};

/**
 * Remove user data from localStorage
 */
export const removeUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
    return true;
  } catch (error) {
    console.error('Failed to remove user:', error);
    return false;
  }
};

/**
 * Check if user is logged in
 */
export const isAuthenticated = () => {
  return hasToken() && !!getUser();
};

// ============================================
// AUTHENTICATION ACTIONS
// ============================================

/**
 * Login with Google OAuth
 */
export const loginWithGoogle = async (credential) => {
  try {
    const result = await authAPI.googleLogin(credential);

    if (result.success) {
      const { token, user } = result.data;
      saveToken(token);
      saveUser(user);

      return {
        success: true,
        user,
        token
      };
    }

    return {
      success: false,
      error: result.error || 'Login failed'
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during login'
    };
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    // Call backend logout API (optional)
    await authAPI.logout();

    // Clear local storage
    removeToken();
    removeUser();

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);

    // Even if API call fails, clear local data
    removeToken();
    removeUser();

    return { success: true };
  }
};

/**
 * Verify if current session is valid
 */
export const verifySession = async () => {
  try {
    if (!hasToken()) {
      return { success: false, error: 'No token found' };
    }

    const result = await authAPI.verifySession();

    if (result.success) {
      // Update user data if provided
      if (result.data.user) {
        saveUser(result.data.user);
      }

      return {
        success: true,
        user: result.data.user || getUser()
      };
    }

    // Session invalid - clear data
    removeToken();
    removeUser();

    return {
      success: false,
      error: 'Session expired'
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return {
      success: false,
      error: 'Failed to verify session'
    };
  }
};

/**
 * Refresh authentication state from localStorage
 */
export const refreshAuthState = () => {
  const token = getToken();
  const user = getUser();

  if (token && user) {
    return {
      isAuthenticated: true,
      user,
      token
    };
  }

  return {
    isAuthenticated: false,
    user: null,
    token: null
  };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  removeToken();
  removeUser();
};

/**
 * Get user ID from stored user data
 */
export const getUserId = () => {
  const user = getUser();
  return user?.id || null;
};

/**
 * Get user email from stored user data
 */
export const getUserEmail = () => {
  const user = getUser();
  return user?.email || null;
};

/**
 * Check if token is expired (basic check)
 * Note: This is a simple implementation. For JWT, use a library like jwt-decode
 */
export const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;

  // For JWT tokens, decode and check expiration
  // This is a placeholder - implement based on your token format
  // Example: const decoded = jwtDecode(token);
  // return decoded.exp * 1000 < Date.now();

  // For now, assume token is valid if it exists
  return false;
};

/**
 * Initialize authentication on app load
 */
export const initializeAuth = async () => {
  try {
    const authState = refreshAuthState();

    if (!authState.isAuthenticated) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Optionally verify session with backend
    // const verification = await verifySession();
    // return verification;

    return {
      success: true,
      user: authState.user
    };
  } catch (error) {
    console.error('Auth initialization error:', error);
    clearAuthData();
    return {
      success: false,
      error: 'Failed to initialize authentication'
    };
  }
};

// ============================================
// GOOGLE OAUTH HELPERS
// ============================================

/**
 * Initialize Google OAuth client
 */
export const initGoogleAuth = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google OAuth not loaded'));
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: () => {}, // Callback handled by component
        auto_select: false,
        cancel_on_tap_outside: true
      });

      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Prompt Google One Tap login
 */
export const promptGoogleOneTap = () => {
  if (typeof window !== 'undefined' && window.google) {
    window.google.accounts.id.prompt();
  }
};

/**
 * Render Google Sign-In button
 */
export const renderGoogleButton = (elementId, options = {}) => {
  if (typeof window !== 'undefined' && window.google) {
    window.google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        ...options
      }
    );
  }
};

const authService = {
  // Token management
  saveToken,
  getToken,
  removeToken,
  hasToken,

  // User management
  saveUser,
  getUser,
  removeUser,
  isAuthenticated,

  // Auth actions
  loginWithGoogle,
  logout,
  verifySession,
  refreshAuthState,
  initializeAuth,

  // Utilities
  clearAuthData,
  getUserId,
  getUserEmail,
  isTokenExpired,

  // Google OAuth
  initGoogleAuth,
  promptGoogleOneTap,
  renderGoogleButton
};

export default authService;