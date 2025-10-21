import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value
 * Useful for search inputs, API calls, and expensive operations
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500ms)
 * @returns {any} Debounced value
 * 
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 500);
 */
const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function - cancel timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;

/**
 * Advanced debounce hook with callback
 * Executes a callback function after debounce delay
 */
export const useDebouncedCallback = (callback, delay = 500) => {
  const [timeoutId, setTimeoutId] = useState(null);

  const debouncedCallback = (...args) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
};

/**
 * Debounce hook with immediate execution option
 * Can trigger on leading edge (immediately) or trailing edge (after delay)
 */
export const useDebounceImmediate = (value, delay = 500, immediate = false) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    // Execute immediately on first change if immediate is true
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