'use client';

/**
 * Theme Provider Component
 * AI Math Tutor v2
 *
 * Provides dark/light theme context and toggle functionality.
 * Defaults to light (bright) theme.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Theme } from '@/types';
import { getSettings, saveSettings } from '@/lib/storage';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const hasInitialized = useRef(false);

  // Load theme from localStorage on mount (runs once)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const settings = getSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initializing from localStorage (external system)
    setThemeState(settings.theme);
    setMounted(true);
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    saveSettings({ theme });
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Always wrap in Provider to prevent "useTheme must be used within ThemeProvider" errors
  // Use conditional rendering inside to handle hydration mismatch
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {mounted ? children : <div className="min-h-screen bg-white">{children}</div>}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
