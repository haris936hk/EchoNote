import axios from 'axios';

// Base API URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request deduplication map - Track pending requests
const pendingRequests = new Map();

// Helper function to generate request key for deduplication
const getRequestKey = (config) => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

// Request interceptor - Add auth token and handle deduplication
api.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Request deduplication - Only for GET requests to prevent loops
    if (config.method === 'get') {
      const requestKey = getRequestKey(config);

      // If same request is already pending, cancel this one
      if (pendingRequests.has(requestKey)) {
        const controller = new AbortController();
        controller.abort();
        config.signal = controller.signal;
        console.log(`[API] Deduplicated request: ${requestKey}`);
      } else {
        // Mark this request as pending
        pendingRequests.set(requestKey, true);
        config.metadata = { requestKey }; // Store key for cleanup
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track if a token refresh is already in progress to prevent multiple simultaneous refreshes
let isRefreshing = false;
let failedQueue = [];

// Process queued requests after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - Handle errors globally, token refresh, and cleanup
api.interceptors.response.use(
  (response) => {
    // Clean up pending request tracker
    const requestKey = response.config?.metadata?.requestKey;
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }
    return response;
  },
  async (error) => {
    // Clean up pending request tracker
    const requestKey = error.config?.metadata?.requestKey;
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }

    // Skip error handling for aborted requests (deduplicated)
    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - Attempt token refresh before logging out
          console.log('[API] 401 Unauthorized - Attempting token refresh');

          // Prevent infinite loop - don't retry if this IS the refresh endpoint
          if (originalRequest.url?.includes('/auth/refresh')) {
            console.log('[API] Refresh token expired - Logging out');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

          // Prevent retry loops - don't retry if already retried
          if (originalRequest._retry) {
            console.log('[API] Retry failed - Logging out');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

          const refreshToken = localStorage.getItem('refreshToken');

          // No refresh token available - logout
          if (!refreshToken) {
            console.log('[API] No refresh token - Logging out');
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

          // If already refreshing, queue this request
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(token => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return api(originalRequest);
              })
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          // Attempt to refresh token
          try {
            const response = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            const { accessToken } = response.data.data;

            // Update token in localStorage
            localStorage.setItem('token', accessToken);
            console.log('[API] Token refreshed successfully');

            // Update authorization header for original request
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

            // Process queued requests
            processQueue(null, accessToken);

            // Retry original request
            return api(originalRequest);
          } catch (refreshError) {
            console.error('[API] Token refresh failed:', refreshError);
            processQueue(refreshError, null);

            // Clear all auth data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }

            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }

        case 403:
          console.error('Forbidden:', data.message);
          break;
        case 404:
          console.error('Not found:', data.message);
          break;
        case 500:
          console.error('Server error:', data.message);
          break;
        default:
          console.error('API error:', data.message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error: No response from server');
    } else {
      // Error in request configuration
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  /**
   * Login with Google OAuth
   */
  googleLogin: async (credential) => {
    try {
      const response = await api.post('/auth/google', { credential });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Logout failed'
      };
    }
  },

  /**
   * Verify current session
   */
  verifySession: async () => {
    try {
      const response = await api.get('/auth/verify');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: 'Session invalid' };
    }
  }
};

// ============================================
// MEETINGS API
// ============================================

export const meetingsAPI = {
  /**
   * Get all meetings for current user
   */
  getAllMeetings: async () => {
    try {
      const response = await api.get('/meetings');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch meetings'
      };
    }
  },

  /**
   * Get single meeting by ID
   */
  getMeetingById: async (id) => {
    try {
      const response = await api.get(`/meetings/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch meeting'
      };
    }
  },

  /**
   * Upload new meeting with audio file
   */
  uploadMeeting: async ({ title, description, category, audioFile }) => {
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('category', category);
      formData.append('audio', audioFile);

      const response = await api.post('/meetings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 seconds for file upload
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload meeting'
      };
    }
  },

  /**
   * Update meeting details
   */
  updateMeeting: async (id, updates) => {
    try {
      const response = await api.patch(`/meetings/${id}`, updates);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update meeting'
      };
    }
  },

  /**
   * Delete meeting
   */
  deleteMeeting: async (id) => {
    try {
      const response = await api.delete(`/meetings/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete meeting'
      };
    }
  },

  /**
   * Search meetings
   */
  searchMeetings: async (query) => {
    try {
      const response = await api.get('/meetings/search', {
        params: { q: query }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Search failed'
      };
    }
  }
};

// ============================================
// USER API
// ============================================

export const userAPI = {
  /**
   * Get current user profile
   */
  getProfile: async () => {
    try {
      const response = await api.get('/user/profile');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch profile'
      };
    }
  },

  /**
   * Update user preferences
   */
  updatePreferences: async (preferences) => {
    try {
      const response = await api.put('/user/preferences', preferences);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update preferences'
      };
    }
  },

  /**
   * Delete user account
   */
  deleteAccount: async () => {
    try {
      const response = await api.delete('/users/me', {
        data: { confirmation: 'DELETE_MY_ACCOUNT' }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete account'
      };
    }
  },

  /**
   * Export user data
   */
  exportData: async () => {
    try {
      const response = await api.get('/user/export', {
        responseType: 'blob'
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to export data'
      };
    }
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if API is reachable
 */
export const checkAPIHealth = async () => {
  try {
    const response = await api.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: 'API unreachable' };
  }
};

/**
 * Download file from URL
 */
export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default api;