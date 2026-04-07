'use client';

import { useEffect, useState } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<string>('seller');

  useEffect(() => {
    // Get user mode from localStorage or API
    const getUserMode = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const userData = await res.json();
            const userMode = userData.current_mode || 'seller';
            setTheme(userMode);
            document.body.className = `${userMode}-theme`;
          }
        }
      } catch (error) {
        console.error('Failed to get user mode:', error);
      }
    };

    getUserMode();

    // Listen for theme changes (when user switches modes)
    const handleThemeChange = () => {
      const currentMode = localStorage.getItem('user_mode') || 'seller';
      setTheme(currentMode);
      document.body.className = `${currentMode}-theme`;
    };

    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  return <>{children}</>;
}