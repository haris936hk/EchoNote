import axios from 'axios';

// Base API URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request deduplication map - Track pending requests
const pendingRequests = new Map();

// Helper function to generate request key for deduplication
const getRequestKey = (config) => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

// Wrap api.request to implement Promise Cache deduplication
const originalRequest = api.request.bind(api);
api.request = (config) => {
  const method = config.method?.toLowerCase() || 'get';

  // Only deduplicate GET requests
  if (method === 'get') {
    const requestKey = getRequestKey(config);

    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    const promise = originalRequest(config).finally(() => {
      pendingRequests.delete(requestKey);
    });

    pendingRequests.set(requestKey, promise);
    return promise;
  }

  return originalRequest(config);
};

// Request interceptor - Add auth token and handle deduplication
api.interceptors.request.use(
  (config) => {
    // Auth token handling
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  failedQueue.forEach((prom) => {
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
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - Attempt token refresh before logging out
          // Prevent infinite loop - don't retry if this IS the refresh endpoint
          if (originalRequest.url?.includes('/auth/refresh')) {
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
              .then((token) => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
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

            // Update authorization header for original request
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

            // Process queued requests
            processQueue(null, accessToken);

            // Retry original request
            return api(originalRequest);
          } catch (refreshError) {
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
        case 404:
        case 500:
        default:
          break;
      }
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
        error: error.response?.data?.message || 'Login failed',
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
        error: error.response?.data?.message || 'Logout failed',
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
    } catch {
      return { success: false, error: 'Session invalid' };
    }
  },
};

// ============================================
// CALENDAR API
// ============================================

export const calendarAPI = {
  /**
   * Get upcoming calendar events
   * @param {number} days - Number of days to fetch ahead (default 7 via backend if undefined)
   */
  getEvents: async (days = 30) => {
    try {
      const response = await api.get('/calendar/events', {
        params: { days },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch calendar events',
        status: error.response?.status,
      };
    }
  },
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
        error: error.response?.data?.message || 'Failed to fetch meetings',
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
        error: error.response?.data?.message || 'Failed to fetch meeting',
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
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for file upload
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload meeting',
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
        error: error.response?.data?.message || 'Failed to update meeting',
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
        error: error.response?.data?.message || 'Failed to delete meeting',
      };
    }
  },

  /**
   * Search meetings
   */
  searchMeetings: async (query) => {
    try {
      const response = await api.get('/meetings/search', {
        params: { q: query },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Search failed',
      };
    }
  },

  /**
   * Get all decisions across all meetings
   */
  getDecisions: async () => {
    try {
      const response = await api.get('/meetings/decisions');
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch decisions archive',
      };
    }
  },

  /**
   * Generate AI follow-up email draft
   */
  generateFollowUp: async (id, tone = 'formal') => {
    try {
      const response = await api.post(`/meetings/${id}/followup`, null, {
        params: { tone },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate follow-up',
      };
    }
  },
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
        error: error.response?.data?.message || 'Failed to fetch profile',
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
        error: error.response?.data?.message || 'Failed to update preferences',
      };
    }
  },

  /**
   * Delete user account
   */
  deleteAccount: async () => {
    try {
      const response = await api.delete('/users/me', {
        data: { confirmation: 'DELETE_MY_ACCOUNT' },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete account',
      };
    }
  },

  /**
   * Export user data
   */
  exportData: async () => {
    try {
      const response = await api.get('/user/export', {
        responseType: 'blob',
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to export data',
      };
    }
  },
};

// ============================================
// TASKS API
// ============================================

export const tasksAPI = {
  /**
   * Get all tasks (action items) for current user
   */
  getTasks: async () => {
    try {
      const response = await api.get('/tasks');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch tasks',
      };
    }
  },

  /**
   * Update task status
   */
  updateTaskStatus: async (id, status) => {
    try {
      const response = await api.patch(`/tasks/${id}`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update task status',
      };
    }
  },
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
  } catch {
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
