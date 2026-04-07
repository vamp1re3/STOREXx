'use client';

import { useEffect, useState } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<string>('logout');

  useEffect(() => {
    // Get user mode from localStorage or API
    const getUserMode = async () => {
      const token = localStorage.getItem('token');
      
      // If no token, use logout theme
      if (!token) {
        setTheme('logout');
        document.body.className = 'logout-theme';
        return;
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
        } else {
          // Token invalid, use logout theme
          setTheme('logout');
          document.body.className = 'logout-theme';
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
      } else {
        setTheme(currentMode);
        document.body.className = `${currentMode}-theme`;
      }
    };

    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  return <>{children}</>;
}