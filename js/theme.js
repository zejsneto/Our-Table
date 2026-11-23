// Tema claro/escuro (preferência salva no navegador)
import { local, $ } from './utils.js';

export function applyTheme(t) {
  const theme = t === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  local.set('ot-theme', theme);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#f6f1e9' : '#0e0c0a';
}
