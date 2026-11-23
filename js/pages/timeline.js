import { store, getPlace, myUid, byDateDesc } from '../store.js';
import { esc, fmtDate, parseDate } from '../utils.js';
import { icon, pageHead, score, cover, emptyState, occasion, kind } from '../ui.js';

let limit = 60;

export default {
  title: 'Linha do tempo',
  live: true,
  render(root) {
    const all = [...store.visits].sort(byDateDesc);
    const list = all.slice(0, limit);
    const uid = myUid();
    if (!all.length) { root.innerHTML = pageHead('Linha do tempo') + emptyState('fa-timeline', 'A história começa no primeiro registro'); return; }

    let html = '', curYear = null, curMonth = null;
    for (const v of list) {
      const d = parseDate(v.date);
      const y = d.getFullYear(), m = d.getMonth();
      if (y !== curYear) { if (curYear !== null) html += '</div>'; html += `<h2 class="tl-year">${y}</h2><div class="tl">`; curYear = y; curMonth = null; }
      if (m !== curMonth) { html += `<div class="tl-month">${esc(d.toLocaleDateString('pt-BR', { month: 'long' }))}</div>`; curMonth = m; }
      const p = getPlace(v.placeId);
      if (!p) continue;
      const o = occasion(v.occasion);
      const locked = !v.ratings?.[uid] && v.ratings && Object.keys(v.ratings).length;
      html += `<a class="tl-item" href="#/visita/${esc(v.id)}">
        <span class="tl-dot">${icon(kind(v.kind).icon)}</span>
        <span class="tl-thumb">${cover(p)}</span>
        <span class="tl-main"><strong>${esc(p.name)}</strong>
          <small>${esc(fmtDate(v.date, { day: '2-digit', month: 'short' }))} · ${icon(o.icon)} ${esc(o.label)}${p.city ? ' · ' + esc(p.city) : ''}</small></span>
        ${locked ? `<span class="score s-none">${icon('fa-lock')}</span>` : score(v.avg)}
      </a>`;
    }
    html += '</div>';

    root.innerHTML = `${pageHead('Linha do tempo', `${all.length} ${all.length === 1 ? 'momento registrado' : 'momentos registrados'}`)}
      <div class="timeline">${html}</div>
      ${all.length > limit ? `<div class="center"><button class="btn btn-ghost" data-more>Ver mais antigos</button></div>` : ''}`;
    root.querySelector('[data-more]')?.addEventListener('click', () => { limit += 60; this.render(root); });
  }
};
