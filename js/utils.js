// Utilitários gerais (formatação, segurança, imagens, modais, toasts)
import { APP } from './config.js';

// ── Segurança: escapar TODO conteúdo de usuário antes de ir pro HTML ──
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const esc = (v) => (v === null || v === undefined) ? '' : String(v).replace(/[&<>"'`]/g, c => ESC[c]);

// Só aceita imagens embutidas (base64) — nunca URLs externas vindas do banco
export const safeImg = (src) => (typeof src === 'string' && /^data:image\/(webp|jpeg|jpg|png|gif);base64,/i.test(src)) ? src : '';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── Texto ──
export const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const clampStr = (s, max) => String(s || '').trim().slice(0, max);

// ── Números e notas ──
export function mean(arr) {
  const n = (arr || []).filter(x => typeof x === 'number' && !Number.isNaN(x));
  return n.length ? n.reduce((s, x) => s + x, 0) / n.length : null;
}
export const round2 = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
export function fmtScore(n, digits = 1) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '–';
  return n.toLocaleString(APP.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function scoreTier(n) {
  if (typeof n !== 'number') return 's-none';
  if (n >= 9) return 's-top';
  if (n >= 7.5) return 's-good';
  if (n >= 6) return 's-mid';
  return 's-low';
}
export function fmtMoney(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '–';
  return n.toLocaleString(APP.locale, { style: 'currency', currency: APP.currency });
}

// ── Datas (sempre "AAAA-MM-DD" no banco, em horário local) ──
export function todayStr(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function parseDate(s) {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
export function fmtDate(s, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString(APP.locale, opts).replace(/\./g, '') : '–';
}
export const fmtDateLong = (s) => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export function daysSince(s) {
  const d = parseDate(s);
  if (!d) return null;
  const t = parseDate(todayStr());
  return Math.round((t - d) / 86400000);
}
export function relDays(s) {
  const n = daysSince(s);
  if (n === null) return '';
  if (n === 0) return 'hoje';
  if (n === 1) return 'ontem';
  if (n < 0) return `em ${-n} dias`;
  if (n < 30) return `há ${n} dias`;
  if (n < 365) { const m = Math.round(n / 30); return `há ${m} ${m === 1 ? 'mês' : 'meses'}`; }
  const y = Math.floor(n / 365); return `há ${y} ${y === 1 ? 'ano' : 'anos'}`;
}
export const monthName = (i) => new Date(2000, i, 1).toLocaleDateString(APP.locale, { month: 'short' }).replace('.', '');

// ── Aleatoriedade ──
export function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
export function secureRandom() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}
export function weightedPick(items, weightFn, rnd = Math.random) {
  const weights = items.map(i => Math.max(0.0001, weightFn(i)));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rnd() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// ── Armazenamento local (só conveniências; pode falhar em modo privado) ──
export const local = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignora */ } }
};

export function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ── Imagens: compressão no navegador (gera base64 leve) ──
async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Não foi possível ler esta imagem.'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
function drawTo(img, maxSide, quality, square = false) {
  let w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (square) {
    const side = Math.min(w, h);
    const out = Math.min(maxSide, side);
    c.width = out; c.height = out;
    ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
  } else {
    const s = Math.min(1, maxSide / Math.max(w, h));
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    ctx.drawImage(img, 0, 0, c.width, c.height);
  }
  let out = c.toDataURL('image/webp', quality);
  if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', quality); // Safari antigo
  return out;
}
const MAX_FULL = 900_000; // limite de 1 MiB por documento do Firestore
export async function processPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Arquivo não é uma imagem.');
  const img = await loadImage(file);
  let full = drawTo(img, 1600, 0.82);
  if (full.length > MAX_FULL) full = drawTo(img, 1280, 0.72);
  if (full.length > MAX_FULL) full = drawTo(img, 1024, 0.62);
  if (full.length > MAX_FULL) throw new Error('Imagem muito grande mesmo após compressão.');
  const thumb = drawTo(img, 480, 0.72, true);
  return { full, thumb };
}
export async function processCover(file) {
  const img = await loadImage(file);
  return drawTo(img, 720, 0.75, true);
}

// ── Toasts ──
export function toast(msg, type = 'ok') {
  let wrap = $('#toasts');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toasts'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, type === 'error' ? 5000 : 3000);
}

// ── Modais ──
export function openModal({ title = '', body = '', foot = '', wide = false, className = '', onClose } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `
    <div class="modal ${wide ? 'modal-wide' : ''} ${className}" role="dialog" aria-modal="true">
      ${title ? `<div class="modal-head"><h3>${title}</h3><button class="btn-icon" data-close aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button></div>` : ''}
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
  document.body.appendChild(back);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => back.classList.add('show'));
  const close = () => {
    back.classList.remove('show');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { back.remove(); if (!$('.modal-backdrop')) document.body.classList.remove('no-scroll'); }, 200);
    onClose && onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  return { el: back.querySelector('.modal'), close };
}

export function confirmDialog(message, { title = 'Confirmar', okText = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title: esc(title),
      body: `<p class="muted">${esc(message)}</p>`,
      foot: `<button class="btn btn-ghost" data-close>Cancelar</button>
             <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(okText)}</button>`,
      onClose: () => { if (!done) resolve(false); }
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; resolve(true); m.close(); });
  });
}

export function setBusy(btn, busy, text) {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>${text ? `<span>${esc(text)}</span>` : ''}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
  }
}

export function friendlyError(e) {
  const code = e?.code || '';
  const map = {
    'permission-denied': 'Sem permissão. Confira se seu usuário está em "members" e se as regras foram publicadas.',
    'unavailable': 'Sem conexão com o servidor. Tente de novo.',
    'resource-exhausted': 'Limite gratuito do dia atingido. Tente amanhã.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
    'auth/missing-email': 'Informe o e-mail.'
  };
  return map[code] || e?.message || 'Algo deu errado.';
}
