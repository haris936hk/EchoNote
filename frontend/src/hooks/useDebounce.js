import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value
 * Useful for search inputs, API calls, and expensive operations
 *
 * @param {any} value 
 * @param {number} delay 
 * @returns {any} 
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 500);
 */
const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;


export const useDebouncedCallback = (callback, delay = 500) => {
  const [timeoutId, setTimeoutId] = useState(null);

  const debouncedCallback = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
};


export const useDebounceImmediate = (value, delay = 500, immediate = false) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    if (immediate && isFirstRender) {
      setDebouncedValue(value);
      setIsFirstRender(false);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, immediate, isFirstRender]);

  return debouncedValue;
};
