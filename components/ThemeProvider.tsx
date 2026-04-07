'use client';

import { useEffect, useState } from 'react';

const THEME_CACHE_KEY = 'theme_cache';
const THEME_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

interface ThemeCache {
  theme: string;
  timestamp: number;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<string>('logout');

  useEffect(() => {
    // Get user mode from cache, localStorage, or API
    const getUserMode = async () => {
      const token = localStorage.getItem('token');
      
      // If no token, use logout theme
      if (!token) {
        setTheme('logout');
        document.body.className = 'logout-theme';
        localStorage.removeItem(THEME_CACHE_KEY);
        return;
      }

      // Check cache first
      const cachedTheme = localStorage.getItem(THEME_CACHE_KEY);
      if (cachedTheme) {
        try {
          const cache: ThemeCache = JSON.parse(cachedTheme);
          if (Date.now() - cache.timestamp < THEME_CACHE_TTL) {
            setTheme(cache.theme);
            document.body.className = `${cache.theme}-theme`;
            return;
          }
        } catch (e) {
          localStorage.removeItem(THEME_CACHE_KEY);
        }
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const userData = await res.json();
          const userMode = userData.current_mode || 'seller';
          setTheme(userMode);
          document.body.className = `${userMode}-theme`;
          
          // Cache the theme
          localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({
            theme: userMode,
            timestamp: Date.now()
          }));
        } else {
          // Token invalid, use logout theme
          setTheme('logout');
          document.body.className = 'logout-theme';
          localStorage.removeItem(THEME_CACHE_KEY);
        }
      } catch (error) {
        console.error('Failed to get user mode:', error);
        // On error, use logout theme
        setTheme('logout');
        document.body.className = 'logout-theme';
      }
    };

    getUserMode();

    // Listen for theme changes (when user switches modes or logs out)
    const handleThemeChange = () => {
      const token = localStorage.getItem('token');
      const currentMode = localStorage.getItem('user_mode');
      
      if (!token || !currentMode) {
        setTheme('logout');
        document.body.className = 'logout-theme';
        localStorage.removeItem(THEME_CACHE_KEY);
      } else {
        setTheme(currentMode);
        document.body.className = `${currentMode}-theme`;
        // Update cache
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({
          theme: currentMode,
          timestamp: Date.now()
        }));
      }
    };

    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  return <>{children}</>;
}