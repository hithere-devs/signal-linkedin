export type Theme = 'light' | 'dark';
const KEY = 'signal.appearance';

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme = readTheme()): void {
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme: Theme): void {
  applyTheme(theme);
  window.dispatchEvent(new Event('signal-appearance-change'));
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* Theme still applies this session. */
  }
}
