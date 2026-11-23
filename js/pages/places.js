import { visitedPlaces } from '../store.js';
import { esc, normalize, local } from '../utils.js';
import { icon, instaItem, placeRow, pageHead, emptyState, category } from '../ui.js';
import { CATEGORIES } from '../config.js';
import { rerender } from '../router.js';

const DEF = { q: '', kind: '', cat: '', city: '', sort: 'recent', view: 'grid' };
let f = { ...DEF, ...local.get('ot-places-filters', {}) };

const SORTS = {
  recent: { label: 'Mais recentes', fn: (a, b) => cmp(b.stats?.lastVisit, a.stats?.lastVisit) },
  oldest: { label: 'Mais antigos', fn: (a, b) => cmp(a.stats?.lastVisit, b.stats?.lastVisit) },
  best: { label: 'Melhor nota', fn: (a, b) => num(b.stats?.avg) - num(a.stats?.avg) },
  worst: { label: 'Pior nota', fn: (a, b) => num(a.stats?.avg, 99) - num(b.stats?.avg, 99) },
  visits: { label: 'Mais visitados', fn: (a, b) => (b.stats?.visits || 0) - (a.stats?.visits || 0) },
  name: { label: 'Nome (A–Z)', fn: (a, b) => a.name.localeCompare(b.name, 'pt-BR') }
};
function cmp(a, b) { return (a || '') < (b || '') ? -1 : (a || '') > (b || '') ? 1 : 0; }
function num(n, def = -1) { return typeof n === 'number' ? n : def; }

export default {
  title: 'Lugares',
  live: true,
  render(root) {
    const all = visitedPlaces();
    const cities = [...new Set(all.map(p => p.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const usedCats = CATEGORIES.filter(c => all.some(p => p.category === c.key));
    const q = normalize(f.q);
    const list = all
      .filter(p => !f.kind || p.kind === f.kind)
      .filter(p => !f.cat || p.category === f.cat)
      .filter(p => !f.city || p.city === f.city)
      .filter(p => !q || p.nameLower?.includes(q) || normalize(p.city).includes(q) || normalize(category(p.category).label).includes(q))
      .sort((SORTS[f.sort] || SORTS.recent).fn);

    root.innerHTML = `
      ${pageHead('Lugares', `${all.length} ${all.length === 1 ? 'lugar' : 'lugares'} na nossa história`,
        `<a class="btn btn-primary" href="#/novo">${icon('fa-plus')} Novo</a>`)}
      <div class="toolbar">
        <div class="search">${icon('fa-magnifying-glass')}<input type="search" data-f="q" value="${esc(f.q)}" placeholder="Buscar por nome, cidade ou tipo…"></div>
        <div class="seg" role="tablist">
          <button data-kind="" class="${!f.kind ? 'active' : ''}">Todos</button>
          <button data-kind="restaurante" class="${f.kind === 'restaurante' ? 'active' : ''}">${icon('fa-utensils')} Restaurantes</button>
          <button data-kind="delivery" class="${f.kind === 'delivery' ? 'active' : ''}">${icon('fa-motorcycle')} Delivery</button>
        </div>
        <div class="toolbar-row">
          <select data-f="cat" aria-label="Categoria"><option value="">Todas as categorias</option>
            ${usedCats.map(c => `<option value="${esc(c.key)}" ${f.cat === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
          <select data-f="city" aria-label="Cidade"><option value="">Todas as cidades</option>
            ${cities.map(c => `<option ${f.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <select data-f="sort" aria-label="Ordenar">${Object.entries(SORTS).map(([k, s]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
          <div class="view-toggle">
            <button class="btn-icon ${f.view === 'grid' ? 'active' : ''}" data-view="grid" aria-label="Grade">${icon('fa-table-cells')}</button>
            <button class="btn-icon ${f.view === 'list' ? 'active' : ''}" data-view="list" aria-label="Lista">${icon('fa-list')}</button>
          </div>
        </div>
      </div>
      <div data-results>
      ${!list.length
        ? emptyState('fa-magnifying-glass', all.length ? 'Nada encontrado' : 'Nenhum lugar ainda', all.length ? 'Tente outros filtros.' : 'Que tal registrar o primeiro?')
        : f.view === 'grid'
          ? `<div class="grid-insta">${list.map(instaItem).join('')}</div>`
          : `<div class="list">${list.map(p => placeRow(p)).join('')}</div>`}
      </div>`;

    const save = () => { local.set('ot-places-filters', f); rerender(); };
    root.querySelectorAll('select[data-f]').forEach(s => s.addEventListener('change', () => { f[s.dataset.f] = s.value; save(); }));
    const search = root.querySelector('input[data-f=q]');
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        f.q = search.value; local.set('ot-places-filters', f); rerender();
        const s2 = document.querySelector('input[data-f=q]');
        if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); }
      }, 250);
    });
    root.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { f.kind = b.dataset.kind; save(); }));
    root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { f.view = b.dataset.view; save(); }));
  }
};
