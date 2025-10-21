/**
 * Storage Service
 * Provides safe access to browser localStorage and sessionStorage
 * with error handling, serialization, and utility methods
 */

// ============================================
// LOCAL STORAGE
// ============================================

/**
 * Set item in localStorage
 */
export const setLocalItem = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return { success: true };
  } catch (error) {
    console.error('LocalStorage setItem error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get item from localStorage
 */
export const getLocalItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('LocalStorage getItem error:', error);
    return defaultValue;
  }
};

/**
 * Remove item from localStorage
 */
export const removeLocalItem = (key) => {
  try {
    localStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    console.error('LocalStorage removeItem error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear all items from localStorage
 */
export const clearLocalStorage = () => {
  try {
    localStorage.clear();
    return { success: true };
  } catch (error) {
    console.error('LocalStorage clear error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if key exists in localStorage
 */
export const hasLocalItem = (key) => {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error('LocalStorage hasItem error:', error);
    return false;
  }
};

/**
 * Get all keys from localStorage
 */
export const getLocalKeys = () => {
  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('LocalStorage getKeys error:', error);
    return [];
  }
};

/**
 * Get localStorage size in bytes
 */
export const getLocalStorageSize = () => {
  try {
    let size = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  } catch (error) {
    console.error('LocalStorage size calculation error:', error);
    return 0;
  }
};

// ============================================
// SESSION STORAGE
// ============================================

/**
 * Set item in sessionStorage
 */
export const setSessionItem = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    sessionStorage.setItem(key, serializedValue);
    return { success: true };
  } catch (error) {
    console.error('SessionStorage setItem error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get item from sessionStorage
 */
export const getSessionItem = (key, defaultValue = null) => {
  try {
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('SessionStorage getItem error:', error);
    return defaultValue;
  }
};

/**
 * Remove item from sessionStorage
 */
export const removeSessionItem = (key) => {
  try {
    sessionStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    console.error('SessionStorage removeItem error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear all items from sessionStorage
 */
export const clearSessionStorage = () => {
  try {
    sessionStorage.clear();
    return { success: true };
  } catch (error) {
    console.error('SessionStorage clear error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// EXPIRING STORAGE (with TTL)
// ============================================

/**
 * Set item with expiration time
 */
export const setItemWithExpiry = (key, value, ttlMs) => {
  try {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + ttlMs
    };
    localStorage.setItem(key, JSON.stringify(item));
    return { success: true };
  } catch (error) {
    console.error('Set item with expiry error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get item with expiration check
 */
export const getItemWithExpiry = (key, defaultValue = null) => {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return defaultValue;
    }

    const item = JSON.parse(itemStr);
    const now = new Date();

    // Check if expired
    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return item.value;
  } catch (error) {
    console.error('Get item with expiry error:', error);
    return defaultValue;
  }
};

// ============================================
// PREFERENCES & SETTINGS
// ============================================

/**
 * Save user preferences
 */
export const savePreferences = (preferences) => {
  return setLocalItem('user_preferences', preferences);
};

/**
 * Get user preferences
 */
export const getPreferences = (defaultPreferences = {}) => {
  return getLocalItem('user_preferences', defaultPreferences);
};

/**
 * Update specific preference
 */
export const updatePreference = (key, value) => {
  try {
    const preferences = getPreferences();
    preferences[key] = value;
    return savePreferences(preferences);
  } catch (error) {
    console.error('Update preference error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear preferences
 */
export const clearPreferences = () => {
  return removeLocalItem('user_preferences');
};

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Cache data with key
 */
export const cacheData = (key, data, ttlMs = 3600000) => {
  return setItemWithExpiry(`cache_${key}`, data, ttlMs);
};

/**
 * Get cached data
 */
export const getCachedData = (key, defaultValue = null) => {
  return getItemWithExpiry(`cache_${key}`, defaultValue);
};

/**
 * Clear specific cache
 */
export const clearCache = (key) => {
  return removeLocalItem(`cache_${key}`);
};

/**
 * Clear all cached data
 */
export const clearAllCache = () => {
  try {
    const keys = getLocalKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    cacheKeys.forEach(key => localStorage.removeItem(key));
    return { success: true };
  } catch (error) {
    console.error('Clear all cache error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// THEME MANAGEMENT
// ============================================

/**
 * Save theme preference
 */
export const saveTheme = (theme) => {
  return setLocalItem('theme', theme);
};

/**
 * Get theme preference
 */
export const getTheme = (defaultTheme = 'light') => {
  return getLocalItem('theme', defaultTheme);
};

/**
 * Toggle theme between light and dark
 */
export const toggleTheme = () => {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  saveTheme(newTheme);
  return newTheme;
};

// ============================================
// RECENT ITEMS MANAGEMENT
// ============================================

/**
 * Add item to recent list
 */
export const addToRecent = (listKey, item, maxItems = 10) => {
  try {
    let recent = getLocalItem(listKey, []);
    
    // Remove duplicates
    recent = recent.filter(i => i.id !== item.id);
    
    // Add to beginning
    recent.unshift(item);
    
    // Limit size
    if (recent.length > maxItems) {
      recent = recent.slice(0, maxItems);
    }
    
    setLocalItem(listKey, recent);
    return { success: true };
  } catch (error) {
    console.error('Add to recent error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get recent items
 */
export const getRecent = (listKey, limit = 10) => {
  const recent = getLocalItem(listKey, []);
  return recent.slice(0, limit);
};

/**
 * Clear recent items
 */
export const clearRecent = (listKey) => {
  return removeLocalItem(listKey);
};

// ============================================
// FAVORITES MANAGEMENT
// ============================================

/**
 * Add item to favorites
 */
export const addToFavorites = (item) => {
  try {
    const favorites = getLocalItem('favorites', []);
    
    // Check if already exists
    const exists = favorites.some(f => f.id === item.id);
    if (exists) {
      return { success: false, error: 'Item already in favorites' };
    }
    
    favorites.push(item);
    setLocalItem('favorites', favorites);
    return { success: true };
  } catch (error) {
    console.error('Add to favorites error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove item from favorites
 */
export const removeFromFavorites = (itemId) => {
  try {
    let favorites = getLocalItem('favorites', []);
    favorites = favorites.filter(f => f.id !== itemId);
    setLocalItem('favorites', favorites);
    return { success: true };
  } catch (error) {
    console.error('Remove from favorites error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get favorites
 */
export const getFavorites = () => {
  return getLocalItem('favorites', []);
};

/**
 * Check if item is favorite
 */
export const isFavorite = (itemId) => {
  const favorites = getFavorites();
  return favorites.some(f => f.id === itemId);
};

/**
 * Clear all favorites
 */
export const clearFavorites = () => {
  return removeLocalItem('favorites');
};

// ============================================
// STORAGE AVAILABILITY CHECK
// ============================================

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if sessionStorage is available
 */
export const isSessionStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

// ============================================
// STORAGE QUOTA
// ============================================

/**
 * Get storage quota information
 */
export const getStorageQuota = async () => {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageInMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
        quotaInMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
        percentUsed: estimate.quota
          ? ((estimate.usage / estimate.quota) * 100).toFixed(2)
          : 0
      };
    }
    return null;
  } catch (error) {
    console.error('Get storage quota error:', error);
    return null;
  }
};

// ============================================
// MIGRATION & CLEANUP
// ============================================

/**
 * Migrate data from old key to new key
 */
export const migrateData = (oldKey, newKey) => {
  try {
    const data = getLocalItem(oldKey);
    if (data !== null) {
      setLocalItem(newKey, data);
      removeLocalItem(oldKey);
      return { success: true };
    }
    return { success: false, error: 'No data to migrate' };
  } catch (error) {
    console.error('Migrate data error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clean up expired items
 */
export const cleanupExpiredItems = () => {
  try {
    const keys = getLocalKeys();
    let cleaned = 0;

    keys.forEach(key => {
      try {
        const itemStr = localStorage.getItem(key);
        const item = JSON.parse(itemStr);
        
        // Check if item has expiry field
        if (item && item.expiry) {
          const now = new Date().getTime();
          if (now > item.expiry) {
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch (e) {
        // Skip items that aren't in expected format
      }
    });

    return { success: true, cleaned };
  } catch (error) {
    console.error('Cleanup expired items error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

const storageService = {
  // Local storage
  setLocalItem,
  getLocalItem,
  removeLocalItem,
  clearLocalStorage,
  hasLocalItem,
  getLocalKeys,
  getLocalStorageSize,

  // Session storage
  setSessionItem,
  getSessionItem,
  removeSessionItem,
  clearSessionStorage,

  // Expiring storage
  setItemWithExpiry,
  getItemWithExpiry,

  // Preferences
  savePreferences,
  getPreferences,
  updatePreference,
  clearPreferences,

  // Cache
  cacheData,
  getCachedData,
  clearCache,
  clearAllCache,

  // Theme
  saveTheme,
  getTheme,
  toggleTheme,

  // Recent items
  addToRecent,
  getRecent,
  clearRecent,

  // Favorites
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  isFavorite,
  clearFavorites,

  // Storage checks
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  getStorageQuota,

  // Utilities
  migrateData,
  cleanupExpiredItems
};

export default storageService;