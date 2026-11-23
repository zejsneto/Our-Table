// Roteador por hash (#/lugares, #/lugar/ID …) — funciona no GitHub Pages sem configuração
import { subscribe, isReady } from './store.js';
import { $$, esc } from './utils.js';

const routes = [];
let current = null;
let view = null;
let waiting = false;

export function addRoute(pattern, page) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, page, pattern });
}

export function navigate(path) { location.hash = '#/' + path.replace(/^#?\/?/, ''); }

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return { route: r, params, query, path };
    }
  }
  return { route: routes.find(r => r.pattern === ''), params: {}, query, path: '' };
}

function cleanup() {
  if (current?.cleanup) { try { current.cleanup(); } catch { /* ignora */ } }
}

export function render({ keepScroll = false } = {}) {
  if (!view) return;
  const { route, params, query, path } = parse();
  if (!isReady()) {
    waiting = true;
    view.innerHTML = `<div class="loader-page"><span class="spinner lg"></span><p class="muted">Arrumando a mesa…</p></div>`;
    return;
  }
  waiting = false;
  const y = window.scrollY;
  cleanup();
  // Um contêiner novo a cada render: os eventos da página anterior somem junto
  const el = document.createElement('div');
  el.className = 'page';
  view.replaceChildren(el);
  const page = route.page;
  let res = null;
  try {
    res = page.render(el, params, query);
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><h3>Ops</h3><p>${esc(e.message || e)}</p></div>`;
  }
  current = { page, params, query, cleanup: typeof res === 'function' ? res : null, path };
  document.title = (page.title ? page.title + ' · ' : '') + 'Our Table';
  const base = path.split('/')[0];
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === base));
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}

let started = false;
export function startRouter(container) {
  view = container;
  if (!started) {
    started = true;
    window.addEventListener('hashchange', () => render());
    subscribe(() => {
      if (!view) return;
      if (waiting && isReady()) return render();
      if (current?.page.live && !(current.page.isBusy && current.page.isBusy())) render({ keepScroll: true });
    });
  }
  render();
}

export function stopRouter() { cleanup(); current = null; view = null; }

export const rerender = () => render({ keepScroll: true });
