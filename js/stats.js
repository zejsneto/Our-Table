// Cálculo de médias (pessoa, casal, lugar)
import { CRITERIA } from './config.js';
import { mean, round2 } from './utils.js';

export const criteriaFor = (kind) => CRITERIA[kind] || CRITERIA.restaurante;

// Média de uma pessoa numa visita (ignora critérios "não se aplica")
export function ratingAvg(rating, kind) {
  if (!rating || !rating.scores) return null;
  return mean(criteriaFor(kind).map(c => rating.scores[c.key]));
}

// Média do casal: média das médias de quem já avaliou
export function coupleAvg(ratings, kind) {
  return mean(Object.values(ratings || {}).map(r => ratingAvg(r, kind)));
}

export function returnVerdict(ratings) {
  const votes = Object.values(ratings || {}).map(r => r.voltaria).filter(Boolean);
  if (!votes.length) return null;
  if (votes.every(v => v === 'sim')) return 'sim';
  if (votes.every(v => v === 'nao')) return 'nao';
  if (votes.includes('nao') && !votes.includes('sim')) return 'nao';
  return 'talvez';
}

// Totais guardados no documento do lugar (para ordenar sem ler todas as visitas)
export function placeStats(visits, kind) {
  const sorted = [...visits].sort((a, b) => (a.date < b.date ? 1 : -1));
  const rated = sorted.filter(v => typeof v.avg === 'number');
  const person = {}, crit = {};
  for (const v of sorted) {
    for (const [uid, r] of Object.entries(v.ratings || {})) {
      (person[uid] = person[uid] || []).push(ratingAvg(r, kind));
      for (const c of criteriaFor(kind)) {
        const val = r.scores?.[c.key];
        if (typeof val === 'number') (crit[c.key] = crit[c.key] || []).push(val);
      }
    }
  }
  const lastRated = sorted.find(v => v.ratings && Object.keys(v.ratings).length);
  const spentList = sorted.map(v => v.spent).filter(n => typeof n === 'number');
  return {
    avg: round2(mean(rated.map(v => v.avg))),
    visits: sorted.length,
    rated: rated.length,
    lastVisit: sorted[0]?.date || null,
    firstVisit: sorted[sorted.length - 1]?.date || null,
    lastReturn: lastRated ? returnVerdict(lastRated.ratings) : null,
    byPerson: Object.fromEntries(Object.entries(person).map(([k, a]) => [k, round2(mean(a))])),
    criteria: Object.fromEntries(Object.entries(crit).map(([k, a]) => [k, round2(mean(a))])),
    spent: spentList.length ? round2(spentList.reduce((s, n) => s + n, 0)) : null
  };
}
