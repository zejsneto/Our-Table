// Ponto de entrada: autenticação, layout e rotas
import { isConfigured, auth, onAuthStateChanged, signOut } from './firebase.js';
import { store, setState, subscribe, pendingVotes, firstName } from './store.js';
import { startSync, stopSync, loadMembers, isMember } from './api.js';
import { addRoute, startRouter, stopRouter } from './router.js';
import { brand, icon } from './ui.js';
import { $, $$, toast, local, friendlyError, esc } from './utils.js';
import { renderLogin } from './pages/login.js';

import home from './pages/home.js';
import places from './pages/places.js';
import place from './pages/place.js';
import visit from './pages/visit.js';
import add from './pages/add.js';
import editPlace from './pages/edit-place.js';
import wishlist from './pages/wishlist.js';
import raffle from './pages/raffle.js';
import hall from './pages/hall.js';
import dashboard from './pages/dashboard.js';
import gallery from './pages/gallery.js';
import timeline from './pages/timeline.js';
import mapPage from './pages/map.js';
import settings from './pages/settings.js';

addRoute('', home);
addRoute('lugares', places);
addRoute('lugar/:id', place);
addRoute('visita/:id', visit);
addRoute('novo', add);
addRoute('editar-lugar/:id', editPlace);
addRoute('quero', wishlist);
addRoute('sorteio', raffle);
addRoute('hall', hall);
addRoute('painel', dashboard);
addRoute('galeria', gallery);
addRoute('historico', timeline);
addRoute('mapa', mapPage);
addRoute('config', settings);

import { applyTheme } from './theme.js';
applyTheme(local.get('ot-theme', 'dark'));

const root = $('#app');

const NAV = [
  { key: '', label: 'Início', icon: 'fa-house' },
  { key: 'lugares', label: 'Lugares', icon: 'fa-utensils' },
  { key: 'quero', label: 'Quero ir', icon: 'fa-bookmark' },
  { key: 'sorteio', label: 'Sorteador', icon: 'fa-dice' },
  { key: 'hall', label: 'Hall da Fama', icon: 'fa-trophy' },
  { key: 'painel', label: 'Painel', icon: 'fa-chart-simple' },
  { key: 'galeria', label: 'Galeria', icon: 'fa-images' },
  { key: 'historico', label: 'Linha do tempo', icon: 'fa-timeline' },
  { key: 'mapa', label: 'Mapa', icon: 'fa-map-location-dot' },
  { key: 'config', label: 'Configurações', icon: 'fa-gear' }
];

function navLink(n) {
  return `<a href="#/${n.key}" data-nav="${n.key}">${icon(n.icon)}<span>${n.label}</span>${n.key === '' ? '<b class="nav-badge" data-pending hidden></b>' : ''}</a>`;
}

function renderShell() {
  root.innerHTML = `
  <div class="app">
    <aside class="sidebar">
      <a class="brand" href="#/">${brand(36)}</a>
      <a class="btn btn-primary nav-add" href="#/novo">${icon('fa-plus')} Novo registro</a>
      <nav class="nav">${NAV.map(navLink).join('')}</nav>
      <div class="sidebar-foot">
        <div class="me">${icon('fa-circle-user')}<span>${esc(firstName(store.user.uid))}</span></div>
        <button class="btn-icon" data-logout title="Sair" aria-label="Sair">${icon('fa-arrow-right-from-bracket')}</button>
      </div>
    </aside>
    <header class="topbar">
      <a class="brand" href="#/">${brand(30)}</a>
      <a class="btn-icon" href="#/config" aria-label="Configurações">${icon('fa-gear')}</a>
    </header>
    <main class="main"><div class="view" id="view"></div></main>
    <nav class="bottom-nav">
      <a href="#/" data-nav="">${icon('fa-house')}<span>Início</span><b class="nav-badge" data-pending hidden></b></a>
      <a href="#/lugares" data-nav="lugares">${icon('fa-utensils')}<span>Lugares</span></a>
      <a href="#/novo" data-nav="novo" class="bn-add" aria-label="Novo registro">${icon('fa-plus')}</a>
      <a href="#/sorteio" data-nav="sorteio">${icon('fa-dice')}<span>Sortear</span></a>
      <button type="button" data-more>${icon('fa-bars')}<span>Mais</span></button>
    </nav>
  </div>`;

  $('[data-logout]', root).addEventListener('click', logout);
  $('[data-more]', root).addEventListener('click', openMore);
  startRouter($('#view'));
}

function openMore() {
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet">
    <div class="sheet-grip"></div>
    <div class="sheet-grid">${NAV.filter(n => !['', 'lugares', 'sorteio'].includes(n.key)).map(n =>
      `<a href="#/${n.key}">${icon(n.icon)}<span>${n.label}</span></a>`).join('')}
      <button type="button" data-logout>${icon('fa-arrow-right-from-bracket')}<span>Sair</span></button>
    </div></div>`;
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add('show'));
  const close = () => { back.classList.remove('show'); setTimeout(() => back.remove(), 250); };
  back.addEventListener('click', (e) => {
    if (e.target.closest('[data-logout]')) { close(); logout(); return; }
    if (e.target === back || e.target.closest('a')) close();
  });
}

function updateBadges() {
  if (!store.user || !store.visitsReady) return;
  const n = pendingVotes().length;
  $$('[data-pending]').forEach(b => { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; });
}
subscribe(updateBadges);

async function logout() {
  await signOut(auth);
}

function renderSetup() {
  root.innerHTML = `
  <div class="login-wrap"><div class="login-card">
    <div class="login-brand">${brand(48)}</div>
    <h2>Quase lá</h2>
    <p class="muted">Configure o Firebase em <code>js/firebase-config.js</code> seguindo o passo a passo do README.</p>
  </div></div>`;
}

if (!isConfigured) {
  renderSetup();
} else {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      stopRouter();
      stopSync();
      setState({ user: null });
      renderLogin(root);
      return;
    }
    try {
      const ok = await isMember(user.uid);
      if (!ok) {
        toast('Esta conta não tem acesso ao Our Table.', 'error');
        await signOut(auth);
        return;
      }
      setState({ user });
      await loadMembers();
      startSync((e) => toast(friendlyError(e), 'error'));
      renderShell();
    } catch (e) {
      console.error(e);
      toast(friendlyError(e), 'error');
      root.innerHTML = '';
      renderLogin(root);
    }
  });
}
