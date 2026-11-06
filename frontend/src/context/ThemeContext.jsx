import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'pfm.theme';
const MODES = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

/**
 * Resolve the actual rendered theme ('light'|'dark') from a mode string.
 */
function resolveTheme(mode) {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  // system
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply the resolved theme to <html data-theme="...">
 */
function applyTheme(resolved) {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

/** Inject a blocking script via <meta> tag to avoid FOUC */
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'light';
  });

  // Apply theme on mount and whenever mode changes
  useEffect(() => {
    const resolved = resolveTheme(mode);
    applyTheme(resolved);
  }, [mode]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(resolveTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  }, [mode, setMode]);

  const resolved = resolveTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggle, resolved, isDark: resolved === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
