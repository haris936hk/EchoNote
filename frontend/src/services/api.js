import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const publicAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const pendingRequests = new Map();

const getRequestKey = (config) => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

const originalRequest = api.request.bind(api);
api.request = (config) => {
  const method = config.method?.toLowerCase() || 'get';

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

let isRefreshing = false;
let failedQueue = [];

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401:
          if (originalRequest.url?.includes('/auth/refresh')) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

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

          if (!refreshToken) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

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

          try {
            const response = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            const { accessToken } = response.data.data;

            localStorage.setItem('token', accessToken);

            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

            processQueue(null, accessToken);

            return api(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);

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

export const authAPI = {

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

  verifySession: async () => {
    try {
      const response = await api.get('/auth/verify');
      return { success: true, data: response.data };
    } catch {
      return { success: false, error: 'Session invalid' };
    }
  },
};

export const calendarAPI = {

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

export const meetingsAPI = {

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
        timeout: 60000,
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload meeting',
      };
    }
  },

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

  getStatistics: async () => {
    try {
      const response = await api.get('/meetings/stats');
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch statistics',
      };
    }
  },

  generateFollowUp: async (id, tone = 'formal') => {
    try {
      const response = await api.post(
        `/meetings/${id}/followup`,
        {},
        {
          params: { tone },
        }
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate follow-up',
      };
    }
  },

  shareToSlack: async (id) => {
    try {
      const response = await api.post(`/meetings/${id}/share/slack`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to share to Slack',
      };
    }
  },
};

export const userAPI = {

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

export const tasksAPI = {

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

  createTask: async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create task',
      };
    }
  },

  updateTask: async (id, updates) => {
    try {
      const response = await api.patch(`/tasks/${id}`, updates);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update task',
      };
    }
  },

  deleteTask: async (id) => {
    try {
      const response = await api.delete(`/tasks/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete task',
      };
    }
  },
};

export const checkAPIHealth = async () => {
  try {
    const response = await api.get('/health');
    return { success: true, data: response.data };
  } catch {
    return { success: false, error: 'API unreachable' };
  }
};

export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default api;
