
export const setLocalItem = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getLocalItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
};

export const removeLocalItem = (key) => {
  try {
    localStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const clearLocalStorage = () => {
  try {
    localStorage.clear();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const hasLocalItem = (key) => {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};

export const getLocalKeys = () => {
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
};

export const getLocalStorageSize = () => {
  try {
    let size = 0;
    for (let key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  } catch {
    return 0;
  }
};

export const setSessionItem = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    sessionStorage.setItem(key, serializedValue);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getSessionItem = (key, defaultValue = null) => {
  try {
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
};

export const removeSessionItem = (key) => {
  try {
    sessionStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const clearSessionStorage = () => {
  try {
    sessionStorage.clear();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const setItemWithExpiry = (key, value, ttlMs) => {
  try {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(item));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getItemWithExpiry = (key, defaultValue = null) => {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return defaultValue;
    }

    const item = JSON.parse(itemStr);
    const now = new Date();

    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return item.value;
  } catch {
    return defaultValue;
  }
};

export const savePreferences = (preferences) => {
  return setLocalItem('user_preferences', preferences);
};

export const getPreferences = (defaultPreferences = {}) => {
  return getLocalItem('user_preferences', defaultPreferences);
};

export const updatePreference = (key, value) => {
  try {
    const preferences = getPreferences();
    preferences[key] = value;
    return savePreferences(preferences);
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const clearPreferences = () => {
  return removeLocalItem('user_preferences');
};

export const cacheData = (key, data, ttlMs = 3600000) => {
  return setItemWithExpiry(`cache_${key}`, data, ttlMs);
};

export const getCachedData = (key, defaultValue = null) => {
  return getItemWithExpiry(`cache_${key}`, defaultValue);
};

export const clearCache = (key) => {
  return removeLocalItem(`cache_${key}`);
};

export const clearAllCache = () => {
  try {
    const keys = getLocalKeys();
    const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
    cacheKeys.forEach((key) => localStorage.removeItem(key));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const saveTheme = (theme) => {
  return setLocalItem('theme', theme);
};

export const getTheme = (defaultTheme = 'light') => {
  return getLocalItem('theme', defaultTheme);
};

export const toggleTheme = () => {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  saveTheme(newTheme);
  return newTheme;
};

export const addToRecent = (listKey, item, maxItems = 10) => {
  try {
    let recent = getLocalItem(listKey, []);

    recent = recent.filter((i) => i.id !== item.id);

    recent.unshift(item);

    if (recent.length > maxItems) {
      recent = recent.slice(0, maxItems);
    }

    setLocalItem(listKey, recent);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getRecent = (listKey, limit = 10) => {
  const recent = getLocalItem(listKey, []);
  return recent.slice(0, limit);
};

export const clearRecent = (listKey) => {
  return removeLocalItem(listKey);
};

export const addToFavorites = (item) => {
  try {
    const favorites = getLocalItem('favorites', []);

    const exists = favorites.some((f) => f.id === item.id);
    if (exists) {
      return { success: false, error: 'Item already in favorites' };
    }

    favorites.push(item);
    setLocalItem('favorites', favorites);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const removeFromFavorites = (itemId) => {
  try {
    let favorites = getLocalItem('favorites', []);
    favorites = favorites.filter((f) => f.id !== itemId);
    setLocalItem('favorites', favorites);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getFavorites = () => {
  return getLocalItem('favorites', []);
};

export const isFavorite = (itemId) => {
  const favorites = getFavorites();
  return favorites.some((f) => f.id === itemId);
};

export const clearFavorites = () => {
  return removeLocalItem('favorites');
};

export const isLocalStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const isSessionStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const getStorageQuota = async () => {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageInMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
        quotaInMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
        percentUsed: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
};

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
    return { success: false, error: error.message };
  }
};

export const cleanupExpiredItems = () => {
  try {
    const keys = getLocalKeys();
    let cleaned = 0;

    keys.forEach((key) => {
      try {
        const itemStr = localStorage.getItem(key);
        const item = JSON.parse(itemStr);

        if (item && item.expiry) {
          const now = new Date().getTime();
          if (now > item.expiry) {
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch {
      }
    });

    return { success: true, cleaned };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const storageService = {
  setLocalItem,
  getLocalItem,
  removeLocalItem,
  clearLocalStorage,
  hasLocalItem,
  getLocalKeys,
  getLocalStorageSize,

  setSessionItem,
  getSessionItem,
  removeSessionItem,
  clearSessionStorage,

  setItemWithExpiry,
  getItemWithExpiry,

  savePreferences,
  getPreferences,
  updatePreference,
  clearPreferences,

  cacheData,
  getCachedData,
  clearCache,
  clearAllCache,

  saveTheme,
  getTheme,
  toggleTheme,

  addToRecent,
  getRecent,
  clearRecent,

  addToFavorites,
  removeFromFavorites,
  getFavorites,
  isFavorite,
  clearFavorites,

  isLocalStorageAvailable,
  isSessionStorageAvailable,
  getStorageQuota,

  migrateData,
  cleanupExpiredItems,
};

export default storageService;
