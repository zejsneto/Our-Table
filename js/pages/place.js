import { getPlace, visitsOf, memberList, myUid } from '../store.js';
import { listPhotos, deletePlace } from '../api.js';
import { esc, safeImg, fmtDate, fmtScore, fmtMoney, confirmDialog, toast, friendlyError, relDays } from '../utils.js';
import { icon, cover, score, kindBadge, categoryTag, occasionTag, returnTag, locationLine, emptyState, kind } from '../ui.js';
import { criteriaFor, ratingAvg } from '../stats.js';
import { navigate } from '../router.js';

const photoCache = new Map(); // placeId -> fotos (evita reler a cada atualização)

function mapsLink(p) {
  if (typeof p.lat === 'number' && typeof p.lng === 'number') return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  const q = [p.name, p.address, p.city, p.state, p.country].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
function safeUrl(u) {
  try { const x = new URL(u); return ['http:', 'https:'].includes(x.protocol) ? x.href : ''; } catch { return ''; }
}

function visitCard(v, p, photos) {
  const mine = v.ratings?.[myUid()];
  const thumbs = photos.filter(ph => ph.visitId === v.id).slice(0, 4);
  return `
  <a class="visit-card" href="#/visita/${esc(v.id)}">
    <div class="visit-date"><span class="vd-day">${esc(fmtDate(v.date, { day: '2-digit' }))}</span><span class="vd-mon">${esc(fmtDate(v.date, { month: 'short', year: 'numeric' }).replace(' de ', ' '))}</span></div>
    <div class="visit-main">
      <div class="visit-tags">${occasionTag(v.occasion)}${typeof v.spent === 'number' ? `<span class="tag">${icon('fa-receipt')}${esc(fmtMoney(v.spent))}</span>` : ''}</div>
      <div class="visit-people">${memberList().map(m => {
        const r = v.ratings?.[m.uid];
        const a = r ? ratingAvg(r, v.kind || p.kind) : null;
        const hidden = r && !mine && m.uid !== myUid();
        return `<span class="person-score" style="--pc:${esc(m.color)}"><i></i>${esc(m.name.split(' ')[0])} <b>${!r ? '—' : hidden ? icon('fa-lock') : esc(fmtScore(a))}</b></span>`;
      }).join('')}</div>
      ${v.notes ? `<p class="visit-notes">${esc(v.notes.length > 140 ? v.notes.slice(0, 140) + '…' : v.notes)}</p>` : ''}
      ${thumbs.length ? `<div class="visit-thumbs">${thumbs.map(t => `<img src="${safeImg(t.thumb)}" alt="" loading="lazy">`).join('')}${v.photoCount > 4 ? `<span>+${v.photoCount - 4}</span>` : ''}</div>` : ''}
    </div>
    <div class="visit-score">${mine || !v.ratings || Object.keys(v.ratings).length === 0 ? score(v.avg, 'score-lg') : `<span class="score score-lg s-none">${icon('fa-lock')}</span>`}
      ${!mine ? `<span class="pending-dot">Sua nota</span>` : ''}</div>
  </a>`;
}

export default {
  title: 'Lugar',
  live: true,
  render(root, { id }) {
    const p = getPlace(id);
    if (!p) { root.innerHTML = emptyState('fa-circle-question', 'Lugar não encontrado', '', `<a class="btn btn-ghost" href="#/lugares">Voltar</a>`); return; }
    this.title = p.name;
    const s = p.stats || {};
    const visits = visitsOf(id);
    const photos = photoCache.get(id) || [];
    const K = kind(p.kind);
    const crit = criteriaFor(p.kind);
    const link = safeUrl(p.link);

    root.innerHTML = `
    <article class="place">
      <header class="place-hero">
        <div class="place-cover">${cover(p)}</div>
        <div class="place-info">
          <a class="back" href="#/lugares">${icon('fa-arrow-left')} Lugares</a>
          <div class="place-badges">${kindBadge(p.kind)}${categoryTag(p.category)}${p.wishlist ? `<span class="tag tag-wish">${icon('fa-bookmark')}${esc(K.wish)}</span>` : ''}${returnTag(s.lastReturn)}</div>
          <h1 class="place-name">${esc(p.name)}</h1>
          <p class="place-loc">${icon('fa-location-dot')} ${p.address ? esc(p.address) + ' · ' : ''}${locationLine(p)}</p>
          <div class="place-links">
            <a class="link" href="${esc(mapsLink(p))}" target="_blank" rel="noopener noreferrer">${icon('fa-map')} Abrir no mapa</a>
            ${link ? `<a class="link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${icon('fa-link')} Link</a>` : ''}
          </div>
          ${p.description ? `<p class="place-desc">${esc(p.description)}</p>` : ''}
          <div class="place-actions">
            <a class="btn btn-primary" href="#/novo?place=${esc(p.id)}">${icon('fa-plus')} ${p.kind === 'delivery' ? 'Novo pedido' : 'Nova visita'}</a>
            <a class="btn btn-ghost" href="#/editar-lugar/${esc(p.id)}">${icon('fa-pen')} Editar</a>
            <button class="btn-icon" data-del title="Excluir lugar" aria-label="Excluir lugar">${icon('fa-trash')}</button>
          </div>
        </div>
      </header>

      ${s.visits ? `
      <section class="stat-grid stat-grid-4">
        <div class="stat"><span class="stat-label">Média do casal</span>${score(s.avg, 'score-xl')}</div>
        <div class="stat"><span class="stat-label">${p.kind === 'delivery' ? 'Pedidos' : 'Visitas'}</span><span class="stat-value">${s.visits}</span></div>
        <div class="stat"><span class="stat-label">Última vez</span><span class="stat-value sm">${esc(fmtDate(s.lastVisit))}</span><small class="faint">${esc(relDays(s.lastVisit))}</small></div>
        <div class="stat"><span class="stat-label">Primeira vez</span><span class="stat-value sm">${esc(fmtDate(s.firstVisit))}</span></div>
      </section>

      <section class="card card-pad two-col">
        <div>
          <h3 class="card-title">Por critério</h3>
          <div class="bars">${crit.map(c => {
            const val = s.criteria?.[c.key];
            return `<div class="bar-row"><span class="bar-label">${icon(c.icon)} ${esc(c.label)}</span>
              <span class="bar-track"><span class="bar-fill" style="width:${typeof val === 'number' ? val * 10 : 0}%"></span></span>
              <span class="bar-val">${esc(fmtScore(val))}</span></div>`;
          }).join('')}</div>
        </div>
        <div>
          <h3 class="card-title">Cada um</h3>
          <div class="people-avg">${memberList().map(m => `
            <div class="person-avg" style="--pc:${esc(m.color)}"><span class="pa-name"><i></i>${esc(m.name)}</span>${score(s.byPerson?.[m.uid], 'score-lg')}</div>`).join('')}</div>
          ${typeof s.spent === 'number' ? `<p class="muted mt">${icon('fa-receipt')} Total gasto aqui: <strong>${esc(fmtMoney(s.spent))}</strong></p>` : ''}
        </div>
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h2>${p.kind === 'delivery' ? 'Pedidos' : 'Visitas'}</h2></div>
        ${visits.length
          ? `<div class="visit-list">${visits.map(v => visitCard(v, p, photos)).join('')}</div>`
          : emptyState('fa-bookmark', p.wishlist ? `Ainda na lista "${K.wish}"` : 'Sem registros', p.wishlist ? 'Quando forem, registrem aqui.' : '',
            `<a class="btn btn-primary" href="#/novo?place=${esc(p.id)}">${icon('fa-check')} ${esc(K.verb)}!</a>`)}
      </section>
    </article>`;

    // Carrega miniaturas das visitas uma vez (e atualiza quando a contagem muda)
    const totalCount = visits.reduce((n, v) => n + (v.photoCount || 0), 0);
    if (totalCount && (!photoCache.has(id) || photoCache.get(id).length !== totalCount)) {
      listPhotos('placeId', id).then(list => {
        const prev = photoCache.get(id);
        photoCache.set(id, list);
        if (!prev || prev.length !== list.length) this.render(root, { id });
      }).catch(() => {});
    }

    root.querySelector('[data-del]')?.addEventListener('click', async () => {
      const ok = await confirmDialog(`Excluir "${p.name}" e todos os ${visits.length} registros e fotos? Isso não pode ser desfeito.`, { title: 'Excluir lugar', okText: 'Excluir', danger: true });
      if (!ok) return;
      try { await deletePlace(id); toast('Lugar excluído.'); navigate('lugares'); }
      catch (e) { toast(friendlyError(e), 'error'); }
    });
  }
};
