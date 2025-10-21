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

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
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

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
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
      const response = await api.put(`/meetings/${id}`, updates);
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
      const response = await api.delete('/user/account');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete account'
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