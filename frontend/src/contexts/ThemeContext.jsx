import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

/**
 * ThemeProvider — Hardcoded to OLED dark mode
 * EchoNote is dark-mode-only by design.
 */
export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Always enforce dark mode
    const root = document.documentElement;
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const value = {
    isDark: true,
    toggleTheme: () => {}, // No-op — dark mode only
    setTheme: () => {}, // No-op — dark mode only
    theme: 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
