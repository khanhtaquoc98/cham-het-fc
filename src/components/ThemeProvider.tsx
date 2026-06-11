'use client';

import { useEffect } from 'react';

/**
 * ThemeProvider fetches the admin-configured site theme from API
 * and applies it as `data-site-theme` attribute on <html>.
 * This activates the corresponding CSS variable overrides.
 */
export default function ThemeProvider() {
  useEffect(() => {
    // Check cached theme first for instant paint
    const cached = sessionStorage.getItem('site-theme');
    if (cached && cached !== 'default') {
      document.documentElement.setAttribute('data-site-theme', cached);
    }

    // Fetch latest from API
    fetch('/api/theme')
      .then(res => res.json())
      .then(data => {
        const theme = data.theme || 'default';
        sessionStorage.setItem('site-theme', theme);
        if (theme !== 'default') {
          document.documentElement.setAttribute('data-site-theme', theme);
        } else {
          document.documentElement.removeAttribute('data-site-theme');
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
