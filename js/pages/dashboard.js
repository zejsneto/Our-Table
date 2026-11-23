import { store, getPlace, memberList } from '../store.js';
import { esc, mean, fmtScore, fmtMoney, fmtDate, monthName, todayStr } from '../utils.js';
import { icon, pageHead, score, category, occasion, emptyState, cover } from '../ui.js';
import { ratingAvg } from '../stats.js';
import { rerender } from '../router.js';

let year = 'all';

function hbars(rows, { fmt = (n) => n, max } = {}) {
  if (!rows.length) return `<p class="faint">Sem dados.</p>`;
  const m = max || Math.max(...rows.map(r => r.value), 1);
  return `<div class="bars">${rows.map(r => `
    <div class="bar-row"><span class="bar-label">${r.icon ? icon(r.icon) : ''} ${esc(r.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(r.value / m) * 100}%"></span></span>
      <span class="bar-val">${esc(fmt(r.value))}</span></div>`).join('')}</div>`;
}

function vbars(cols) {
  const m = Math.max(...cols.map(c => c.value), 1);
  return `<div class="vbars">${cols.map(c => `
    <div class="vbar" title="${esc(c.label)}: ${c.value}">
      <span class="vbar-val">${c.value || ''}</span>
      <span class="vbar-track"><span class="vbar-fill" style="height:${(c.value / m) * 100}%"></span></span>
      <span class="vbar-label">${esc(c.label)}</span>
    </div>`).join('')}</div>`;
}

function countBy(list, keyFn) {
  const m = new Map();
  list.forEach(x => { const k = keyFn(x); if (k) m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default {
  title: 'Painel',
  live: true,
  render(root) {
    const years = [...new Set(store.visits.map(v => v.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
    if (year !== 'all' && !years.includes(year)) year = 'all';
    const visits = store.visits.filter(v => year === 'all' || v.date?.startsWith(year));
    const members = memberList();

    if (!store.visits.length) {
      root.innerHTML = pageHead('Painel') + emptyState('fa-chart-simple', 'Ainda sem números', 'O painel ganha vida com os primeiros registros.');
      return;
    }

    const rest = visits.filter(v => v.kind === 'restaurante');
    const deliv = visits.filter(v => v.kind === 'delivery');
    const placeIds = new Set(visits.map(v => v.placeId));
    const newPlaces = store.places.filter(p => p.stats?.firstVisit && (year === 'all' || p.stats.firstVisit.startsWith(year))).length;
    const coupleAvg = mean(visits.map(v => v.avg));
    const spentList = visits.map(v => v.spent).filter(n => typeof n === 'number');
    const spent = spentList.reduce((s, n) => s + n, 0);
    const cities = new Set([...placeIds].map(id => getPlace(id)?.city).filter(Boolean));

    // Pessoas
    const personStats = members.map(m => {
      const avgs = visits.map(v => v.ratings?.[m.uid] ? ratingAvg(v.ratings[m.uid], v.kind) : null).filter(n => typeof n === 'number');
      return { ...m, avg: mean(avgs), n: avgs.length };
    });
    let agreement = null;
    if (members.length >= 2) {
      const [a, b] = members;
      const diffs = visits.map(v => {
        const x = v.ratings?.[a.uid] && ratingAvg(v.ratings[a.uid], v.kind);
        const y = v.ratings?.[b.uid] && ratingAvg(v.ratings[b.uid], v.kind);
        return typeof x === 'number' && typeof y === 'number' ? Math.abs(x - y) : null;
      }).filter(n => typeof n === 'number');
      agreement = diffs.length ? { diff: mean(diffs), n: diffs.length } : null;
    }
    const strict = personStats.filter(p => typeof p.avg === 'number').sort((a, b) => a.avg - b.avg);

    // Séries
    let timeCols;
    if (year === 'all') {
      const ys = [...years].reverse();
      timeCols = ys.map(y => ({ label: y, value: store.visits.filter(v => v.date?.startsWith(y)).length }));
    } else {
      timeCols = Array.from({ length: 12 }, (_, i) => ({ label: monthName(i), value: visits.filter(v => Number(v.date.slice(5, 7)) === i + 1).length }));
    }
    const cats = countBy(visits, v => getPlace(v.placeId)?.category).slice(0, 8).map(([k, n]) => ({ label: category(k).label, icon: category(k).icon, value: n }));
    const occs = countBy(visits, v => v.occasion).slice(0, 8).map(([k, n]) => ({ label: occasion(k).label, icon: occasion(k).icon, value: n }));
    const topCities = countBy(visits, v => getPlace(v.placeId)?.city).slice(0, 6).map(([k, n]) => ({ label: k, icon: 'fa-location-dot', value: n }));
    const buckets = Array.from({ length: 6 }, (_, i) => ({ label: i === 0 ? '< 5' : `${i + 4}–${i + 5}`, value: 0 }));
    visits.forEach(v => { if (typeof v.avg === 'number') buckets[Math.max(0, Math.min(5, Math.floor(v.avg) - 4))].value++; });

    const best = [...visits].filter(v => typeof v.avg === 'number').sort((a, b) => b.avg - a.avg)[0];
    const mostVisited = countBy(visits, v => v.placeId)[0];
    const last = [...visits].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const highlight = (title, v, extra) => {
      const p = v && getPlace(v.placeId || v);
      if (!p) return '';
      return `<a class="highlight" href="#/${v.placeId ? 'visita/' + esc(v.id) : 'lugar/' + esc(p.id)}">
        <div class="hl-img">${cover(p)}</div>
        <div><span class="eyebrow">${title}</span><strong>${esc(p.name)}</strong><small>${extra}</small></div></a>`;
    };

    root.innerHTML = `
      ${pageHead('Painel', year === 'all' ? 'Toda a nossa história' : `O nosso ${esc(year)}`,
        `<select data-year aria-label="Ano"><option value="all">Todos os anos</option>${years.map(y => `<option ${y === year ? 'selected' : ''}>${esc(y)}</option>`).join('')}</select>`)}

      <section class="stat-grid">
        <div class="stat"><span class="stat-label">${icon('fa-store')} Lugares</span><span class="stat-value">${placeIds.size}</span>${year !== 'all' ? `<small class="faint">${newPlaces} ${newPlaces === 1 ? 'novo' : 'novos'} no ano</small>` : ''}</div>
        <div class="stat"><span class="stat-label">${icon('fa-utensils')} Saídas</span><span class="stat-value">${rest.length}</span></div>
        <div class="stat"><span class="stat-label">${icon('fa-motorcycle')} Deliveries</span><span class="stat-value">${deliv.length}</span></div>
        <div class="stat"><span class="stat-label">${icon('fa-star')} Média do casal</span>${score(coupleAvg, 'score-xl')}</div>
        <div class="stat"><span class="stat-label">${icon('fa-receipt')} Gasto registrado</span><span class="stat-value sm">${spentList.length ? esc(fmtMoney(spent)) : '–'}</span>${spentList.length ? `<small class="faint">${esc(fmtMoney(spent / spentList.length))} por registro</small>` : ''}</div>
        <div class="stat"><span class="stat-label">${icon('fa-earth-americas')} Cidades</span><span class="stat-value">${cities.size}</span></div>
      </section>

      <section class="dash-grid">
        <div class="card card-pad">
          <h3 class="card-title">${year === 'all' ? 'Registros por ano' : 'Registros por mês'}</h3>
          ${vbars(timeCols)}
        </div>
        <div class="card card-pad">
          <h3 class="card-title">Nós dois</h3>
          <div class="people-avg">${personStats.map(p => `
            <div class="person-avg" style="--pc:${esc(p.color)}"><span class="pa-name"><i></i>${esc(p.name)} <small class="faint">${p.n} notas</small></span>${score(p.avg, 'score-lg')}</div>`).join('')}</div>
          ${strict.length >= 2 && strict[0].avg !== strict[strict.length - 1].avg ? `<p class="muted mt">${icon('fa-magnifying-glass')} <strong>${esc(strict[0].name.split(' ')[0])}</strong> é mais exigente (${esc(fmtScore(strict[strict.length - 1].avg - strict[0].avg))} ponto de diferença).</p>` : ''}
          ${agreement ? `<p class="muted">${icon('fa-handshake')} Em média, as notas de vocês diferem <strong>${esc(fmtScore(agreement.diff))}</strong> ponto ${agreement.diff < 0.75 ? '— quase sempre concordam!' : agreement.diff < 1.5 ? '— opiniões parecidas.' : '— gostos bem diferentes!'}</p>` : ''}
        </div>
        <div class="card card-pad"><h3 class="card-title">Tipos de comida</h3>${hbars(cats)}</div>
        <div class="card card-pad"><h3 class="card-title">Ocasiões</h3>${hbars(occs)}</div>
        <div class="card card-pad"><h3 class="card-title">Distribuição das notas</h3>${vbars(buckets)}</div>
        <div class="card card-pad"><h3 class="card-title">Cidades</h3>${hbars(topCities)}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Destaques</h2></div>
        <div class="highlights">
          ${best ? highlight('Melhor experiência', best, `${esc(fmtDate(best.date))} · nota ${esc(fmtScore(best.avg))}`) : ''}
          ${mostVisited ? highlight('Mais frequentado', mostVisited[0], `${mostVisited[1]} ${mostVisited[1] === 1 ? 'registro' : 'registros'}`) : ''}
          ${last ? highlight('Último registro', last, esc(fmtDate(last.date))) : ''}
        </div>
      </section>`;

    root.querySelector('[data-year]').addEventListener('change', (e) => { year = e.target.value; rerender(); });
  }
};
