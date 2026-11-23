import { wishPlaces } from '../store.js';
import { deletePlace, updatePlace } from '../api.js';
import { esc, confirmDialog, toast, friendlyError } from '../utils.js';
import { icon, pageHead, cover, category, locationLine, emptyState, kind } from '../ui.js';
import { rerender } from '../router.js';

let tab = 'restaurante';

export default {
  title: 'Quero ir',
  live: true,
  render(root) {
    const all = wishPlaces();
    const list = all.filter(p => p.kind === tab).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const count = (k) => all.filter(p => p.kind === k).length;

    root.innerHTML = `
      ${pageHead('Lista de desejos', 'Lugares para conhecer juntos',
        `<a class="btn btn-primary" href="#/novo?wish=1&kind=${tab}">${icon('fa-plus')} Adicionar</a>`)}
      <div class="seg seg-tabs">
        <button data-tab="restaurante" class="${tab === 'restaurante' ? 'active' : ''}">${icon('fa-utensils')} Quero ir <b>${count('restaurante')}</b></button>
        <button data-tab="delivery" class="${tab === 'delivery' ? 'active' : ''}">${icon('fa-motorcycle')} Quero pedir <b>${count('delivery')}</b></button>
      </div>
      ${list.length ? `<div class="wish-grid">${list.map(p => `
        <article class="wish-card">
          <a class="wish-img" href="#/lugar/${esc(p.id)}">${cover(p)}</a>
          <div class="wish-body">
            <a href="#/lugar/${esc(p.id)}" class="wish-name">${esc(p.name)}</a>
            <p class="list-sub">${icon(category(p.category).icon)} ${esc(category(p.category).label)} · ${locationLine(p)}</p>
            ${p.description ? `<p class="list-sub faint">${esc(p.description)}</p>` : ''}
            <div class="wish-actions">
              <a class="btn btn-primary btn-sm" href="#/novo?place=${esc(p.id)}">${icon('fa-check')} ${esc(kind(p.kind).verb)}!</a>
              <button class="btn-icon" data-rm="${esc(p.id)}" aria-label="Remover da lista">${icon('fa-trash')}</button>
            </div>
          </div>
        </article>`).join('')}</div>`
        : emptyState('fa-bookmark', tab === 'delivery' ? 'Nada para pedir na lista' : 'Nada na lista ainda', 'Viu um lugar interessante? Salve aqui para não esquecer.',
          `<a class="btn btn-ghost" href="#/novo?wish=1&kind=${tab}">${icon('fa-plus')} Adicionar à lista</a>`)}`;

    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; rerender(); }));
    root.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
      const p = all.find(x => x.id === b.dataset.rm);
      if (!p) return;
      if (!(await confirmDialog(`Remover "${p.name}" da lista?`, { okText: 'Remover', danger: true }))) return;
      try {
        // Se já tem registros, só tira da lista; se não, apaga o lugar
        if (p.stats?.visits) await updatePlace(p.id, { wishlist: false }); else await deletePlace(p.id);
        toast('Removido da lista.');
      }
      catch (e) { toast(friendlyError(e), 'error'); }
    }));
  }
};
