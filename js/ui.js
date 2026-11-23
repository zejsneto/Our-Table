// Componentes visuais reutilizáveis
import { CATEGORIES, OCCASIONS, KINDS, RETURN_OPTIONS, PHOTO_KINDS } from './config.js';
import { esc, safeImg, fmtScore, scoreTier, fmtDate, relDays } from './utils.js';

export const LOGO_SVG = (size = 40) => `
<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <circle cx="32" cy="32" r="19" stroke="currentColor" stroke-width="1.6"/>
  <circle cx="32" cy="32" r="13.5" stroke="currentColor" stroke-width=".8" opacity=".55"/>
  <path d="M32 38.6c-5.6-4.1-7.2-7.4-4.8-9.7 1.7-1.6 3.8-1 4.8.8 1-1.8 3.1-2.4 4.8-.8 2.4 2.3.8 5.6-4.8 9.7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M7.5 13v7.2a2.6 2.6 0 0 0 5.2 0V13M10.1 13v9.8M10.1 22.8V51" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M55.5 51V13c-3.2 2.2-4.4 8.4-4.4 14.4 0 2.1 1.4 3.2 4.4 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const brand = (size = 34) => `
  <span class="brand-lockup">${LOGO_SVG(size)}<span class="brand-text">Our <em>Table</em></span></span>`;

export const icon = (name, extra = '') => `<i class="fa-solid ${esc(name)} ${extra}" aria-hidden="true"></i>`;

export const category = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
export const occasion = (key) => OCCASIONS.find(o => o.key === key) || OCCASIONS[0];
export const kind = (key) => KINDS[key] || KINDS.restaurante;

export function score(n, size = '') {
  return `<span class="score ${size} ${scoreTier(n)}">${fmtScore(n)}</span>`;
}

export function kindBadge(k) {
  const K = kind(k);
  return `<span class="badge badge-${esc(k)}">${icon(K.icon)}${esc(K.label)}</span>`;
}
export function categoryTag(key) {
  const c = category(key);
  return `<span class="tag">${icon(c.icon)}${esc(c.label)}</span>`;
}
export function occasionTag(key) {
  const o = occasion(key);
  return `<span class="tag tag-occ">${icon(o.icon)}${esc(o.label)}</span>`;
}
export function returnTag(v) {
  if (!v || !RETURN_OPTIONS[v]) return '';
  const r = RETURN_OPTIONS[v];
  return `<span class="tag tag-ret ret-${esc(v)}">${icon(r.icon)}${esc(r.label)}</span>`;
}
export function photoKindTag(k) {
  const p = PHOTO_KINDS[k] || PHOTO_KINDS.lugar;
  return `<span class="photo-kind">${icon(p.icon)}${esc(p.label)}</span>`;
}

export function locationLine(p) {
  const parts = [p.city, p.state].filter(Boolean).map(esc).join(' · ');
  const country = p.country && p.country !== 'Brasil' ? ` · ${esc(p.country)}` : '';
  return parts + country;
}

// Capa (miniatura base64) ou um placeholder elegante com o ícone da categoria
export function cover(p, cls = '') {
  const src = safeImg(p?.cover);
  if (src) return `<img class="cover ${cls}" src="${src}" alt="" loading="lazy">`;
  const c = category(p?.category);
  return `<div class="cover cover-ph ${cls}">${icon(c.icon)}</div>`;
}

// Item da grade estilo Instagram (foto + nome embaixo)
export function instaItem(p) {
  const s = p.stats || {};
  return `
  <a class="insta-item" href="#/lugar/${esc(p.id)}">
    <div class="insta-img">
      ${cover(p)}
      ${typeof s.avg === 'number' ? `<span class="insta-score">${score(s.avg)}</span>` : ''}
      <span class="insta-kind" title="${esc(kind(p.kind).label)}">${icon(kind(p.kind).icon)}</span>
    </div>
    <div class="insta-name">${esc(p.name)}</div>
    <div class="insta-meta">${esc(category(p.category).label)} · ${esc(p.city || '')}</div>
  </a>`;
}

// Linha de lista
export function placeRow(p, extra = '') {
  const s = p.stats || {};
  return `
  <a class="list-row" href="#/lugar/${esc(p.id)}">
    <div class="list-thumb">${cover(p)}</div>
    <div class="list-main">
      <div class="list-title">${esc(p.name)}</div>
      <div class="list-sub">${icon(category(p.category).icon)} ${esc(category(p.category).label)} · ${locationLine(p)}</div>
      <div class="list-sub faint">${s.visits ? `${s.visits} ${s.visits === 1 ? 'registro' : 'registros'} · última ${esc(fmtDate(s.lastVisit))}` : 'Sem registros'}${extra}</div>
    </div>
    <div class="list-score">${score(s.avg, 'score-lg')}</div>
  </a>`;
}

export function emptyState(ic, title, text = '', action = '') {
  return `<div class="empty">${icon(ic)}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
}

export function pageHead(title, subtitle = '', actions = '') {
  return `<header class="page-head">
    <div><h1 class="title">${title}</h1>${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}</div>
    ${actions ? `<div class="actions">${actions}</div>` : ''}
  </header>`;
}

export function lastSeen(p) {
  const s = p.stats || {};
  if (p.wishlist) return `${icon('fa-bookmark')} Na lista "${esc(kind(p.kind).wish)}"`;
  if (!s.lastVisit) return '';
  return `${icon('fa-clock-rotate-left')} Última vez ${esc(relDays(s.lastVisit))}`;
}

export function optionList(items, selected, { placeholder } = {}) {
  return (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') +
    items.map(i => `<option value="${esc(i.key)}" ${i.key === selected ? 'selected' : ''}>${esc(i.label)}</option>`).join('');
}
