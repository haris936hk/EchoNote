import { authAPI } from './api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const saveToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
};

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
};

export const hasToken = () => {
  return !!getToken();
};

export const saveUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
};

export const getUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const removeUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
    return true;
  } catch {
    return false;
  }
};

export const isAuthenticated = () => {
  return hasToken() && !!getUser();
};

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
        token,
      };
    }

    return {
      success: false,
      error: result.error || 'Login failed',
    };
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred during login',
    };
  }
};

export const logout = async () => {
  try {
    await authAPI.logout();

    removeToken();
    removeUser();

    return { success: true };
  } catch {
    removeToken();
    removeUser();

    return { success: true };
  }
};

export const verifySession = async () => {
  try {
    if (!hasToken()) {
      return { success: false, error: 'No token found' };
    }

    const result = await authAPI.verifySession();

    if (result.success) {
      if (result.data.user) {
        saveUser(result.data.user);
      }

      return {
        success: true,
        user: result.data.user || getUser(),
      };
    }

    removeToken();
    removeUser();

    return {
      success: false,
      error: 'Session expired',
    };
  } catch {
    return {
      success: false,
      error: 'Failed to verify session',
    };
  }
};

export const refreshAuthState = () => {
  const token = getToken();
  const user = getUser();

  if (token && user) {
    return {
      isAuthenticated: true,
      user,
      token,
    };
  }

  return {
    isAuthenticated: false,
    user: null,
    token: null,
  };
};

export const clearAuthData = () => {
  removeToken();
  removeUser();
};

export const getUserId = () => {
  const user = getUser();
  return user?.id || null;
};

export const getUserEmail = () => {
  const user = getUser();
  return user?.email || null;
};

export const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;

  return false;
};

export const initializeAuth = async () => {
  try {
    const authState = refreshAuthState();

    if (!authState.isAuthenticated) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    return {
      success: true,
      user: authState.user,
    };
  } catch {
    clearAuthData();
    return {
      success: false,
      error: 'Failed to initialize authentication',
    };
  }
};

export const initGoogleAuth = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google OAuth not loaded'));
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: () => {},
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

export const promptGoogleOneTap = () => {
  if (typeof window !== 'undefined' && window.google) {
    window.google.accounts.id.prompt();
  }
};

export const renderGoogleButton = (elementId, options = {}) => {
  if (typeof window !== 'undefined' && window.google) {
    window.google.accounts.id.renderButton(document.getElementById(elementId), {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      ...options,
    });
  }
};

const authService = {
  saveToken,
  getToken,
  removeToken,
  hasToken,

  saveUser,
  getUser,
  removeUser,
  isAuthenticated,

  loginWithGoogle,
  logout,
  verifySession,
  refreshAuthState,
  initializeAuth,

  clearAuthData,
  getUserId,
  getUserEmail,
  isTokenExpired,

  initGoogleAuth,
  promptGoogleOneTap,
  renderGoogleButton,
};

export default authService;
