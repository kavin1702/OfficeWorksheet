'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'theme-dark' | 'theme-light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('theme-dark');

  useEffect(() => {
    const saved = localStorage.getItem('workpulse_theme') as Theme | null;
    if (saved) {
      setTheme(saved);
      document.body.className = saved;
    } else {
      document.body.className = 'theme-dark';
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'theme-dark' ? 'theme-light' : 'theme-dark';
    setTheme(next);
    localStorage.setItem('workpulse_theme', next);
    document.body.className = next;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};