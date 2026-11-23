import { getPlace, getVisit } from '../store.js';
import { listPhotosPage, getPhotoFull } from '../api.js';
import { esc, safeImg, fmtDate, openModal, toast, friendlyError } from '../utils.js';
import { icon, pageHead, emptyState, photoKindTag } from '../ui.js';
import { PHOTO_KINDS } from '../config.js';

let state = { items: [], cursor: null, done: false, loading: false, loaded: false };
let filter = '';

export default {
  title: 'Galeria',
  live: false,
  render(root) {
    root.innerHTML = `
      ${pageHead('Galeria', 'Pratos, lugares e nós dois')}
      <div class="chips">
        <button class="chip ${!filter ? 'active' : ''}" data-f="">Todas</button>
        ${Object.entries(PHOTO_KINDS).map(([k, o]) => `<button class="chip ${filter === k ? 'active' : ''}" data-f="${k}">${icon(o.icon)} ${esc(o.label)}</button>`).join('')}
      </div>
      <div data-grid></div>
      <div class="center" data-more></div>`;

    const grid = root.querySelector('[data-grid]');
    const more = root.querySelector('[data-more]');

    const paint = () => {
      const list = state.items.filter(p => !filter || p.kind === filter);
      if (!list.length && state.loaded && state.done) {
        grid.innerHTML = emptyState('fa-images', 'Nenhuma foto', 'Adicione fotos aos registros para preencher a galeria.');
      } else {
        grid.innerHTML = `<div class="gallery-grid">${list.map(p => {
          const place = getPlace(p.placeId);
          return `<button class="gal-item" data-id="${esc(p.id)}"><img src="${safeImg(p.thumb)}" alt="" loading="lazy">
            <span class="gal-cap">${esc(place?.name || '')}<small>${esc(fmtDate(p.date))}</small></span></button>`;
        }).join('')}${state.loading ? Array.from({ length: 6 }).map(() => '<div class="gal-item skeleton"></div>').join('') : ''}</div>`;
      }
      more.innerHTML = !state.done && state.loaded && !state.loading ? `<button class="btn btn-ghost">Carregar mais</button>` : '';
      grid.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => open(state.items.find(x => x.id === b.dataset.id))));
    };

    const load = async () => {
      if (state.loading || state.done) return;
      state.loading = true; paint();
      try {
        const r = await listPhotosPage(state.cursor, 30);
        state.items.push(...r.items.filter(x => !state.items.some(y => y.id === x.id)));
        state.cursor = r.cursor; state.done = r.done;
      } catch (e) { toast(friendlyError(e), 'error'); state.done = true; }
      state.loading = false; state.loaded = true;
      if (root.isConnected) paint();
    };

    const open = (ph) => {
      if (!ph) return;
      const place = getPlace(ph.placeId);
      const visit = getVisit(ph.visitId);
      const m = openModal({
        className: 'lightbox', wide: true,
        body: `<div class="lb-img"><img src="${safeImg(ph.thumb)}" alt="" class="lb-blur"><span class="spinner lg"></span></div>
          <div class="lb-bar"><div>${photoKindTag(ph.kind)} <strong>${esc(place?.name || '')}</strong> <span class="faint">· ${esc(fmtDate(ph.date))}</span></div>
          <div class="lb-actions">${visit ? `<a class="btn btn-ghost btn-sm" href="#/visita/${esc(visit.id)}" data-close>Ver registro</a>` : ''}
          <button class="btn-icon" data-close aria-label="Fechar">${icon('fa-xmark')}</button></div></div>`
      });
      getPhotoFull(ph.id).then(src => {
        const box = m.el.querySelector('.lb-img');
        if (box && safeImg(src)) box.innerHTML = `<img src="${safeImg(src)}" alt="">`;
      }).catch(() => {});
    };

    root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      filter = b.dataset.f;
      root.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b));
      paint();
    }));
    more.addEventListener('click', (e) => { if (e.target.closest('button')) load(); });

    // Recarrega do zero ao abrir a galeria (pega fotos novas)
    state = { items: [], cursor: null, done: false, loading: false, loaded: false };
    load();
  }
};
