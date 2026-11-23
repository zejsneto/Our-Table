import { store } from '../store.js';
import { esc, secureRandom, daysSince, fmtScore, local } from '../utils.js';
import { icon, pageHead, cover, score, category, kind, locationLine, lastSeen, emptyState } from '../ui.js';
import { CATEGORIES } from '../config.js';
import { rerender } from '../router.js';

const DEF = { kind: 'restaurante', min: 0, cats: [], city: '', notRecent: 0, skipNo: true, wish: false };
let f = { ...DEF, ...local.get('ot-raffle', {}) };
let spinning = false;
let lastPick = null;

function pool() {
  return store.places.filter(p => {
    if (p.kind !== f.kind) return false;
    if (p.wishlist) return f.wish;
    if (!p.stats?.visits) return false;
    if (f.min > 0 && !(typeof p.stats.avg === 'number' && p.stats.avg >= f.min)) return false;
    if (f.cats.length && !f.cats.includes(p.category)) return false;
    if (f.city && p.city !== f.city) return false;
    if (f.skipNo && p.stats.lastReturn === 'nao') return false;
    if (f.notRecent && (daysSince(p.stats.lastVisit) ?? 9999) < f.notRecent) return false;
    return true;
  }).filter(p => !f.cats.length || f.cats.includes(p.category))
    .filter(p => !f.city || p.city === f.city);
}

function resultCard(p) {
  const s = p.stats || {};
  return `<article class="raffle-result">
    <div class="rr-img">${cover(p)}</div>
    <div class="rr-body">
      <span class="eyebrow">${icon('fa-wand-magic-sparkles')} O destino escolheu</span>
      <h2>${esc(p.name)}</h2>
      <p class="list-sub">${icon(category(p.category).icon)} ${esc(category(p.category).label)} · ${locationLine(p)}</p>
      <p class="list-sub faint">${lastSeen(p)}</p>
      <div class="rr-foot">${typeof s.avg === 'number' ? score(s.avg, 'score-lg') : ''}
        <a class="btn btn-ghost btn-sm" href="#/lugar/${esc(p.id)}">Ver lugar</a>
        <a class="btn btn-primary btn-sm" href="#/novo?place=${esc(p.id)}">${icon('fa-check')} ${esc(kind(p.kind).verb)}!</a></div>
    </div></article>`;
}

export default {
  title: 'Sorteador',
  live: true,
  isBusy: () => spinning,
  render(root) {
    const cities = [...new Set(store.places.filter(p => p.kind === f.kind).map(p => p.city).filter(Boolean))].sort();
    const usedCats = CATEGORIES.filter(c => store.places.some(p => p.kind === f.kind && p.category === c.key));
    const list = pool();
    const pick = lastPick && list.find(p => p.id === lastPick);

    root.innerHTML = `
      ${pageHead('Sorteador', 'Não conseguem decidir? Deixa com a sorte.')}
      <div class="raffle">
        <section class="card card-pad raffle-filters">
          <div class="seg seg-full">
            <button data-k="restaurante" class="${f.kind === 'restaurante' ? 'active' : ''}">${icon('fa-utensils')} Sair para comer</button>
            <button data-k="delivery" class="${f.kind === 'delivery' ? 'active' : ''}">${icon('fa-motorcycle')} Pedir delivery</button>
          </div>
          <label class="field"><span>Nota mínima: <b data-minv>${f.min ? fmtScore(f.min) : 'qualquer'}</b></span>
            <input type="range" min="0" max="10" step="0.5" value="${f.min}" data-min style="--p:${f.min * 10}%"></label>
          <div class="field"><span>Tipos de comida ${f.cats.length ? `<button class="link-btn" data-clearcats>limpar</button>` : ''}</span>
            <div class="chips">${usedCats.length ? usedCats.map(c => `<button class="chip ${f.cats.includes(c.key) ? 'active' : ''}" data-cat="${esc(c.key)}">${icon(c.icon)} ${esc(c.label)}</button>`).join('') : '<span class="faint">Cadastre lugares para filtrar.</span>'}</div></div>
          <div class="row">
            <label class="field"><span>Cidade</span><select data-city><option value="">Qualquer</option>${cities.map(c => `<option ${f.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
            <label class="field"><span>Não repetir</span><select data-recent>
              ${[[0, 'Tanto faz'], [7, 'Última semana'], [15, '15 dias'], [30, 'Último mês'], [90, '3 meses']].map(([d, l]) => `<option value="${d}" ${f.notRecent === d ? 'selected' : ''}>${l}</option>`).join('')}
            </select></label>
          </div>
          <label class="check"><input type="checkbox" data-skipno ${f.skipNo ? 'checked' : ''}><span class="check-box">${icon('fa-check')}</span><span>Ignorar os que "não voltaria"</span></label>
          <label class="check"><input type="checkbox" data-wish ${f.wish ? 'checked' : ''}><span class="check-box">${icon('fa-check')}</span><span>Incluir a lista "${esc(kind(f.kind).wish)}"</span></label>
        </section>

        <section class="raffle-stage">
          <div class="slot" data-slot>
            ${pick ? resultCard(pick) : `<div class="slot-idle">${icon('fa-dice')}<p>${list.length} ${list.length === 1 ? 'opção' : 'opções'} no sorteio</p></div>`}
          </div>
          <button class="btn btn-primary btn-lg" data-spin ${list.length ? '' : 'disabled'}>${icon('fa-dice')} Sortear</button>
          ${!list.length ? `<p class="muted center">Nenhum lugar com esses filtros.</p>` : ''}
        </section>
      </div>`;

    const save = () => { local.set('ot-raffle', f); lastPick = null; rerender(); };
    root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { f.kind = b.dataset.k; f.cats = []; f.city = ''; save(); }));
    const min = root.querySelector('[data-min]');
    min.addEventListener('input', () => { root.querySelector('[data-minv]').textContent = Number(min.value) ? fmtScore(Number(min.value)) : 'qualquer'; min.style.setProperty('--p', `${min.value * 10}%`); });
    min.addEventListener('change', () => { f.min = Number(min.value); save(); });
    root.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.cat; f.cats = f.cats.includes(k) ? f.cats.filter(x => x !== k) : [...f.cats, k]; save();
    }));
    root.querySelector('[data-clearcats]')?.addEventListener('click', () => { f.cats = []; save(); });
    root.querySelector('[data-city]').addEventListener('change', (e) => { f.city = e.target.value; save(); });
    root.querySelector('[data-recent]').addEventListener('change', (e) => { f.notRecent = Number(e.target.value); save(); });
    root.querySelector('[data-skipno]').addEventListener('change', (e) => { f.skipNo = e.target.checked; save(); });
    root.querySelector('[data-wish]').addEventListener('change', (e) => { f.wish = e.target.checked; save(); });

    root.querySelector('[data-spin]').addEventListener('click', (e) => {
      if (spinning || !list.length) return;
      spinning = true;
      e.currentTarget.disabled = true;
      const slot = root.querySelector('[data-slot]');
      const winner = list[Math.floor(secureRandom() * list.length)];
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const steps = reduce ? 1 : 22;
      let i = 0;
      slot.innerHTML = `<div class="slot-roll"><span data-name></span></div>`;
      const nameEl = slot.querySelector('[data-name]');
      const tick = () => {
        i++;
        const p = i >= steps ? winner : list[Math.floor(secureRandom() * list.length)];
        nameEl.textContent = p.name;
        nameEl.classList.remove('flip'); void nameEl.offsetWidth; nameEl.classList.add('flip');
        if (i < steps) setTimeout(tick, 45 + i * i * 0.9);
        else setTimeout(() => {
          slot.innerHTML = resultCard(winner);
          lastPick = winner.id;
          spinning = false;
          const btn = root.querySelector('[data-spin]');
          if (btn) { btn.disabled = false; btn.innerHTML = `${icon('fa-rotate')} Sortear de novo`; }
        }, 350);
      };
      tick();
    });
  }
};
