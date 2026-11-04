export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'zapwebp_theme';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme;
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

let currentTheme: Theme = getInitialTheme();

// Apply immediately on script load to prevent flash
document.documentElement.setAttribute('data-theme', currentTheme);

const listeners: Array<(theme: Theme) => void> = [];

export function getTheme(): Theme {
  return currentTheme;
}

export function setTheme(theme: Theme): void {
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  listeners.forEach((fn) => fn(theme));
}

export function toggleTheme(): Theme {
  const next = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function onThemeChange(fn: (theme: Theme) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

