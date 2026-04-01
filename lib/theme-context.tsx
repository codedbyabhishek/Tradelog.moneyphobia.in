'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Theme type - supports light, dark, system preference, and cyberpunk
 */
export type Theme = 'light' | 'dark' | 'system' | 'cyberpunk';

/**
 * Theme context type definition
 */
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

type AppliedTheme = 'light' | 'dark' | 'cyberpunk';

function getStoredThemePreference(): Theme {
  if (typeof window === 'undefined') {
    return 'system';
  }

  return (localStorage.getItem('theme-preference') as Theme) || 'system';
}

function getSystemResolvedTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: AppliedTheme, preference: Theme) {
  const html = document.documentElement;

  html.classList.remove('light', 'dark', 'cyberpunk');
  html.classList.add(resolved);
  html.setAttribute('data-theme', resolved);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const colorMap = {
      light: '#f8f8f8',
      dark: '#161616',
      cyberpunk: '#0a0e27',
    };
    metaThemeColor.setAttribute('content', colorMap[resolved]);
  }

  window.dispatchEvent(
    new CustomEvent('themechange', {
      detail: { theme: resolved, preference },
    })
  );
}

/**
 * Theme Context - provides theme management across the app
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Custom hook to use theme context
 * @throws Error if used outside ThemeProvider
 * @returns Theme context values and setters
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * ThemeProvider - Manages theme state and persistence
 * Supports light, dark, and system preferences with localStorage persistence
 * @param children - React components to wrap
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredThemePreference);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemResolvedTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme === 'cyberpunk' ? 'dark' : theme;

  /**
   * Initialize theme from localStorage and system preference
   * Only runs on client to avoid hydration mismatch
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const appliedTheme: AppliedTheme = theme === 'system' ? resolvedTheme : theme;
    applyTheme(appliedTheme, theme);
  }, [theme, resolvedTheme]);

  /**
   * Update theme and persist to localStorage
   * @param newTheme - Theme to set ('light', 'dark', 'cyberpunk', or 'system')
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme-preference', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
