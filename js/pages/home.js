import { store, visitedPlaces, wishPlaces, pendingVotes, firstName, getPlace, myUid, byDateDesc } from '../store.js';
import { esc, todayStr, fmtDateLong, fmtDate, daysSince, seededRandom, weightedPick, parseDate, relDays } from '../utils.js';
import { rerender } from '../router.js';
import { icon, cover, score, instaItem, category, kind, locationLine, lastSeen, emptyState, occasionTag } from '../ui.js';

const rerolls = { restaurante: 0, delivery: 0 };
let gridLimit = 24;

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// Sugestão do dia: prioriza lugares bem avaliados que vocês não visitam há um tempo
function suggest(k) {
  const pool = store.places.filter(p => p.kind === k && (p.wishlist || (p.stats?.visits && p.stats.lastReturn !== 'nao')));
  if (!pool.length) return null;
  const rnd = seededRandom(`${todayStr()}|${k}|${rerolls[k]}`);
  return weightedPick(pool, (p) => {
    if (p.wishlist) return 0.9;
    const avg = typeof p.stats.avg === 'number' ? p.stats.avg : 6.5;
    const days = Math.min(daysSince(p.stats.lastVisit) ?? 60, 180);
    const recentPenalty = days < 7 ? 0.25 : 1;
    return Math.pow(avg / 10, 3) * (1 + days / 60) * recentPenalty;
  }, rnd);
}

function suggestionCard(k) {
  const K = kind(k);
  const p = suggest(k);
  const title = k === 'delivery' ? 'Para pedir hoje' : 'Para sair hoje';
  if (!p) {
    return `<article class="suggest-card suggest-empty">
      <div class="suggest-body">
        <span class="eyebrow">${icon(K.icon)} ${title}</span>
        <h3>Nada por aqui ainda</h3>
        <p class="muted">Cadastre um ${k === 'delivery' ? 'delivery' : 'restaurante'} para receber sugestões.</p>
        <a class="btn btn-ghost btn-sm" href="#/novo?kind=${k}">${icon('fa-plus')} Adicionar</a>
      </div></article>`;
  }
  const s = p.stats || {};
  return `<article class="suggest-card">
    <div class="suggest-media">${cover(p)}</div>
    <div class="suggest-body">
      <span class="eyebrow">${icon(K.icon)} ${title}</span>
      <h3>${esc(p.name)}</h3>
      <p class="suggest-meta">${icon(category(p.category).icon)} ${esc(category(p.category).label)} · ${locationLine(p)}</p>
      <p class="suggest-meta faint">${lastSeen(p)}</p>
      <div class="suggest-foot">
        ${typeof s.avg === 'number' ? score(s.avg, 'score-lg') : '<span class="tag">Novidade</span>'}
        <div class="suggest-actions">
          <button class="btn-icon" data-reroll="${k}" title="Outra sugestão" aria-label="Outra sugestão">${icon('fa-shuffle')}</button>
          <a class="btn btn-ghost btn-sm" href="#/lugar/${esc(p.id)}">Ver</a>
        </div>
      </div>
    </div></article>`;
}

function memories() {
  const today = parseDate(todayStr());
  const out = [];
  for (const v of store.visits) {
    const d = parseDate(v.date);
    if (!d || d.getFullYear() >= today.getFullYear()) continue;
    const sameYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.abs((sameYear - today) / 86400000);
    if (diff <= 3) out.push(v);
  }
  return out.sort(byDateDesc).slice(0, 3);
}

export default {
  title: 'Início',
  live: true,
  render(root) {
    const uid = myUid();
    const visited = visitedPlaces();
    const pending = pendingVotes();
    const mem = memories();
    const grid = [...visited].sort((a, b) => ((b.stats?.lastVisit || '') > (a.stats?.lastVisit || '') ? 1 : -1));

    root.innerHTML = `
    <section class="hero">
      <div class="hero-head">
        <p class="eyebrow">${esc(fmtDateLong(todayStr()))}</p>
        <h1 class="hero-title">${greeting()}, <em>${esc(firstName(uid))}</em>.</h1>
        <p class="hero-sub">Sugestões para hoje</p>
      </div>
      <div class="suggest-grid">${suggestionCard('restaurante')}${suggestionCard('delivery')}</div>
    </section>

    ${pending.length ? `
    <a class="banner" href="#/visita/${esc(pending[0].id)}">
      <span class="banner-icon">${icon('fa-star-half-stroke')}</span>
      <span><strong>${pending.length} ${pending.length === 1 ? 'registro aguarda' : 'registros aguardam'} sua nota</strong>
      <small>${esc(getPlace(pending[0].placeId)?.name || '')} · ${esc(fmtDate(pending[0].date))}</small></span>
      ${icon('fa-chevron-right', 'banner-go')}
    </a>` : ''}

    ${mem.length ? `
    <section class="section">
      <div class="section-head"><h2>${icon('fa-hourglass-half')} Nesta época, anos atrás</h2></div>
      <div class="memory-row">${mem.map(v => {
        const p = getPlace(v.placeId); if (!p) return '';
        const years = parseDate(todayStr()).getFullYear() - parseDate(v.date).getFullYear();
        return `<a class="memory" href="#/visita/${esc(v.id)}">
          <div class="memory-img">${cover(p)}</div>
          <div><span class="eyebrow">Há ${years} ${years === 1 ? 'ano' : 'anos'}</span>
          <strong>${esc(p.name)}</strong><small>${esc(fmtDate(v.date))} ${v.occasion && v.occasion !== 'casual' ? '· ' + occasionTag(v.occasion) : ''}</small></div>
        </a>`;
      }).join('')}</div>
    </section>` : ''}

    <section class="section">
      <div class="section-head">
        <h2>Nossa mesa</h2>
        <a class="link" href="#/lugares">Ver todos ${icon('fa-arrow-right')}</a>
      </div>
      ${grid.length ? `<div class="grid-insta">${grid.slice(0, gridLimit).map(instaItem).join('')}</div>
        ${grid.length > gridLimit ? `<div class="center"><button class="btn btn-ghost" data-more>Carregar mais</button></div>` : ''}`
        : emptyState('fa-utensils', 'A mesa está posta', 'Registre o primeiro restaurante ou delivery de vocês.', `<a class="btn btn-primary" href="#/novo">${icon('fa-plus')} Novo registro</a>`)}
    </section>

    ${wishPlaces().length ? `
    <a class="banner banner-soft" href="#/quero">
      <span class="banner-icon">${icon('fa-bookmark')}</span>
      <span><strong>${wishPlaces().length} ${wishPlaces().length === 1 ? 'lugar' : 'lugares'} na lista de desejos</strong><small>Quero ir · Quero pedir</small></span>
      ${icon('fa-chevron-right', 'banner-go')}
    </a>` : ''}
    `;

    root.addEventListener('click', (e) => {
      const r = e.target.closest('[data-reroll]');
      if (r) { rerolls[r.dataset.reroll]++; rerender(); return; }
      if (e.target.closest('[data-more]')) { gridLimit += 24; rerender(); }
    });
  }
};
