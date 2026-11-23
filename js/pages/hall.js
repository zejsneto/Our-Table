import { visitedPlaces, memberList } from '../store.js';
import { esc } from '../utils.js';
import { icon, pageHead, cover, score, category, locationLine, emptyState } from '../ui.js';
import { ALL_CRITERIA, CATEGORIES } from '../config.js';
import { rerender } from '../router.js';

let tab = '';

const rated = (list) => list.filter(p => typeof p.stats?.avg === 'number');
const byAvg = (a, b) => (b.stats.avg - a.stats.avg) || ((b.stats.visits || 0) - (a.stats.visits || 0)) || a.name.localeCompare(b.name);

export default {
  title: 'Hall da Fama',
  live: true,
  render(root) {
    const all = rated(visitedPlaces());
    const list = all.filter(p => !tab || p.kind === tab).sort(byAvg);
    const top = list.slice(0, 10);
    const [g, s, b] = top;

    const podium = (p, pos) => !p ? '' : `
      <a class="podium-item pos-${pos}" href="#/lugar/${esc(p.id)}">
        <div class="podium-img">${cover(p)}<span class="medal">${pos}</span></div>
        <strong>${esc(p.name)}</strong>
        <small>${esc(category(p.category).label)} · ${esc(p.city || '')}</small>
        ${score(p.stats.avg, pos === 1 ? 'score-xl' : 'score-lg')}
      </a>`;

    // Destaques por critério
    const crit = ALL_CRITERIA.map(c => {
      const best = list.filter(p => typeof p.stats.criteria?.[c.key] === 'number')
        .sort((a, b) => b.stats.criteria[c.key] - a.stats.criteria[c.key])[0];
      return best ? { c, p: best, v: best.stats.criteria[c.key] } : null;
    }).filter(Boolean);

    // Melhor de cada tipo de comida
    const cats = CATEGORIES.map(c => {
      const best = list.filter(p => p.category === c.key)[0];
      return best ? { c, p: best } : null;
    }).filter(Boolean);

    // Favorito de cada um
    const favs = memberList().map(m => {
      const best = list.filter(p => typeof p.stats.byPerson?.[m.uid] === 'number')
        .sort((a, b) => b.stats.byPerson[m.uid] - a.stats.byPerson[m.uid])[0];
      return best ? { m, p: best } : null;
    }).filter(Boolean);

    root.innerHTML = `
      ${pageHead(`${icon('fa-trophy')} Hall da Fama`, 'Os 10 melhores da nossa história')}
      <div class="seg seg-tabs">
        <button data-tab="" class="${!tab ? 'active' : ''}">Geral</button>
        <button data-tab="restaurante" class="${tab === 'restaurante' ? 'active' : ''}">${icon('fa-utensils')} Restaurantes</button>
        <button data-tab="delivery" class="${tab === 'delivery' ? 'active' : ''}">${icon('fa-motorcycle')} Delivery</button>
      </div>
      ${!top.length ? emptyState('fa-trophy', 'O pódio está vazio', 'Avaliem alguns lugares para montar o ranking.') : `
      <section class="podium">${podium(s, 2)}${podium(g, 1)}${podium(b, 3)}</section>
      ${top.length > 3 ? `<ol class="rank-list" start="4">${top.slice(3).map((p, i) => `
        <li><a href="#/lugar/${esc(p.id)}">
          <span class="rank-n">${i + 4}</span>
          <span class="list-thumb">${cover(p)}</span>
          <span class="list-main"><span class="list-title">${esc(p.name)}</span>
            <span class="list-sub">${esc(category(p.category).label)} · ${locationLine(p)} · ${p.stats.visits} ${p.stats.visits === 1 ? 'registro' : 'registros'}</span></span>
          ${score(p.stats.avg, 'score-lg')}
        </a></li>`).join('')}</ol>` : ''}

      ${favs.length ? `<section class="section">
        <div class="section-head"><h2>O favorito de cada um</h2></div>
        <div class="award-grid">${favs.map(({ m, p }) => `
          <a class="award" href="#/lugar/${esc(p.id)}" style="--pc:${esc(m.color)}">
            <span class="award-label"><i class="dot"></i>${esc(m.name)}</span>
            <strong>${esc(p.name)}</strong>${score(p.stats.byPerson[m.uid])}</a>`).join('')}</div>
      </section>` : ''}

      ${crit.length ? `<section class="section">
        <div class="section-head"><h2>Campeões por critério</h2></div>
        <div class="award-grid">${crit.map(({ c, p, v }) => `
          <a class="award" href="#/lugar/${esc(p.id)}">
            <span class="award-label">${icon(c.icon)} ${esc(c.label)}</span>
            <strong>${esc(p.name)}</strong>${score(v)}</a>`).join('')}</div>
      </section>` : ''}

      ${cats.length ? `<section class="section">
        <div class="section-head"><h2>O melhor de cada tipo</h2></div>
        <div class="award-grid">${cats.map(({ c, p }) => `
          <a class="award" href="#/lugar/${esc(p.id)}">
            <span class="award-label">${icon(c.icon)} ${esc(c.label)}</span>
            <strong>${esc(p.name)}</strong>${score(p.stats.avg)}</a>`).join('')}</div>
      </section>` : ''}`}`;

    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; rerender(); }));
  }
};
