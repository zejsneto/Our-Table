import { getVisit, getPlace, memberList, myUid, visitsOf } from '../store.js';
import { saveRating, updateVisit, deleteVisit, listPhotos, addPhotos, getPhotoFull, deletePhoto, setPlaceCover } from '../api.js';
import { esc, safeImg, fmtDate, fmtDateLong, fmtScore, fmtMoney, toast, friendlyError, confirmDialog, openModal, setBusy, processPhoto, scoreTier, clampStr } from '../utils.js';
import { icon, score, kindBadge, occasionTag, returnTag, emptyState, photoKindTag, optionList, kind } from '../ui.js';
import { criteriaFor, ratingAvg } from '../stats.js';
import { OCCASIONS, RETURN_OPTIONS, PHOTO_KINDS } from '../config.js';
import { navigate, rerender } from '../router.js';

let editing = false;          // formulário de nota aberto → não re-renderizar
let photoState = { visitId: null, list: null, loading: false };

function ratingView(r, v, m) {
  const crit = criteriaFor(v.kind);
  const a = ratingAvg(r, v.kind);
  return `
    <div class="rating-scores">
      ${crit.map(c => {
        const val = r.scores?.[c.key];
        return `<div class="crit-line"><span>${icon(c.icon)} ${esc(c.label)}</span>
          <span class="crit-dots"><span class="bar-track"><span class="bar-fill" style="width:${typeof val === 'number' ? val * 10 : 0}%"></span></span></span>
          <b class="${scoreTier(val)}">${typeof val === 'number' ? esc(fmtScore(val)) : 'N/A'}</b></div>`;
      }).join('')}
    </div>
    <div class="rating-foot">${returnTag(r.voltaria)}<span class="rating-avg">Média ${score(a)}</span></div>
    ${r.comment ? `<blockquote class="rating-comment">“${esc(r.comment)}”</blockquote>` : ''}`;
}

function ratingForm(v, r) {
  const crit = criteriaFor(v.kind);
  const sc = r?.scores || {};
  return `
  <form class="rating-form" data-rating-form>
    ${crit.map(c => {
      const val = sc[c.key];
      const na = r && typeof val !== 'number';
      const start = typeof val === 'number' ? val : 8;
      return `<div class="crit-row ${na ? 'is-na' : ''}" data-crit="${esc(c.key)}">
        <div class="crit-head"><span>${icon(c.icon)} ${esc(c.label)}</span>
          <span class="crit-val ${scoreTier(start)}" data-val>${na ? 'N/A' : esc(fmtScore(start))}</span></div>
        <div class="crit-input">
          <input type="range" min="0" max="10" step="0.5" value="${start}" ${na ? 'disabled' : ''} aria-label="${esc(c.label)}">
          <label class="na-toggle"><input type="checkbox" ${na ? 'checked' : ''}> N/A</label>
        </div>
      </div>`;
    }).join('')}
    <div class="field">
      <span>Voltaria?</span>
      <div class="seg seg-full" data-return>
        ${Object.entries(RETURN_OPTIONS).map(([k, o]) => `<button type="button" data-v="${k}" class="${(r?.voltaria || 'sim') === k ? 'active' : ''}">${icon(o.icon)} ${esc(o.label)}</button>`).join('')}
      </div>
    </div>
    <label class="field"><span>Comentário (opcional)</span>
      <textarea name="comment" rows="2" maxlength="600" placeholder="O que achou?">${esc(r?.comment || '')}</textarea></label>
    <div class="rating-live">Sua média: <span data-live>–</span></div>
    <div class="form-actions">
      ${r ? `<button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>` : ''}
      <button type="submit" class="btn btn-primary">${icon('fa-check')} Salvar minha nota</button>
    </div>
  </form>`;
}

function photosBlock(v) {
  const list = photoState.visitId === v.id ? photoState.list : null;
  if (!v.photoCount && (!list || !list.length)) {
    return `<div class="photo-empty"><p class="muted">Nenhuma foto ainda.</p></div>`;
  }
  if (!list) return `<div class="photo-grid">${Array.from({ length: Math.min(v.photoCount || 3, 6) }).map(() => '<div class="photo-item skeleton"></div>').join('')}</div>`;
  return `<div class="photo-grid">${list.map(ph => `
    <button class="photo-item" data-photo="${esc(ph.id)}"><img src="${safeImg(ph.thumb)}" alt="" loading="lazy">${photoKindTag(ph.kind)}</button>`).join('')}</div>`;
}

async function loadPhotos(v) {
  if (photoState.loading) return;
  photoState = { visitId: v.id, list: photoState.visitId === v.id ? photoState.list : null, loading: true };
  try {
    const list = await listPhotos('visitId', v.id);
    photoState = { visitId: v.id, list, loading: false };
  } catch (e) {
    photoState.loading = false;
    toast(friendlyError(e), 'error');
  }
  paintPhotos();
}

let ctx = { v: null, p: null };
function paintPhotos() {
  const box = document.querySelector('[data-photos]');
  if (!box || !ctx.v || photoState.visitId !== ctx.v.id) return;
  box.innerHTML = photosBlock(ctx.v);
  box.querySelectorAll('[data-photo]').forEach(b => b.addEventListener('click', () => {
    const ph = (photoState.list || []).find(x => x.id === b.dataset.photo);
    if (ph) openLightbox(ph, ctx.v, ctx.p);
  }));
}

function openLightbox(ph, v, p) {
  const m = openModal({
    className: 'lightbox',
    wide: true,
    body: `
      <div class="lb-img"><img src="${safeImg(ph.thumb)}" alt="" class="lb-blur"><span class="spinner lg"></span></div>
      <div class="lb-bar">
        <div>${photoKindTag(ph.kind)} <strong>${esc(p?.name || '')}</strong> <span class="faint">· ${esc(fmtDate(v.date))}</span></div>
        <div class="lb-actions">
          <button class="btn btn-ghost btn-sm" data-cover>${icon('fa-image')} Usar como capa</button>
          <button class="btn-icon" data-delph aria-label="Excluir foto">${icon('fa-trash')}</button>
          <button class="btn-icon" data-close aria-label="Fechar">${icon('fa-xmark')}</button>
        </div>
      </div>`
  });
  getPhotoFull(ph.id).then(src => {
    const box = m.el.querySelector('.lb-img');
    if (!box) return;
    const ok = safeImg(src);
    box.innerHTML = ok ? `<img src="${ok}" alt="">` : `<img src="${safeImg(ph.thumb)}" alt="">`;
  }).catch(() => {});
  m.el.querySelector('[data-cover]').addEventListener('click', async () => {
    try { await setPlaceCover(v.placeId, ph.thumb); toast('Capa atualizada.'); m.close(); }
    catch (e) { toast(friendlyError(e), 'error'); }
  });
  m.el.querySelector('[data-delph]').addEventListener('click', async () => {
    if (!(await confirmDialog('Excluir esta foto?', { okText: 'Excluir', danger: true }))) return;
    try {
      await deletePhoto(ph);
      photoState.list = (photoState.list || []).filter(x => x.id !== ph.id);
      m.close(); toast('Foto excluída.'); paintPhotos();
    } catch (e) { toast(friendlyError(e), 'error'); }
  });
}

function editInfoModal(v) {
  const m = openModal({
    title: 'Editar registro',
    body: `<form class="form" id="edit-visit">
      <div class="row">
        <label class="field"><span>Data</span><input type="date" name="date" value="${esc(v.date)}" required></label>
        <label class="field"><span>Ocasião</span><select name="occasion">${optionList(OCCASIONS, v.occasion)}</select></label>
      </div>
      <label class="field"><span>O que pedimos</span><textarea name="ordered" rows="2" maxlength="1000">${esc(v.ordered || '')}</textarea></label>
      <label class="field"><span>Quanto gastamos (R$)</span><input type="number" name="spent" min="0" step="0.01" inputmode="decimal" value="${typeof v.spent === 'number' ? v.spent : ''}"></label>
      <label class="field"><span>Observações</span><textarea name="notes" rows="3" maxlength="2000">${esc(v.notes || '')}</textarea></label>
    </form>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Salvar</button>`
  });
  m.el.querySelector('[data-save]').addEventListener('click', async (e) => {
    const f = m.el.querySelector('#edit-visit');
    if (!f.date.value) return toast('Informe a data.', 'error');
    setBusy(e.currentTarget, true);
    try {
      const spent = f.spent.value === '' ? null : Math.max(0, Number(f.spent.value));
      await updateVisit(v.id, {
        date: f.date.value, occasion: f.occasion.value,
        ordered: clampStr(f.ordered.value, 1000), notes: clampStr(f.notes.value, 2000),
        spent: Number.isFinite(spent) ? spent : null
      });
      toast('Registro atualizado.'); m.close();
    } catch (err) { toast(friendlyError(err), 'error'); setBusy(e.currentTarget, false); }
  });
}

export default {
  title: 'Registro',
  live: true,
  isBusy: () => editing,
  render(root, { id }) {
    const v = getVisit(id);
    if (!v) { editing = false; root.innerHTML = emptyState('fa-circle-question', 'Registro não encontrado', '', `<a class="btn btn-ghost" href="#/">Início</a>`); return; }
    const p = getPlace(v.placeId);
    const uid = myUid();
    const mine = v.ratings?.[uid];
    const members = memberList();
    const all = visitsOf(v.placeId);
    const idx = all.findIndex(x => x.id === v.id);
    const nth = all.length - idx;
    if (photoState.visitId !== v.id) { photoState = { visitId: v.id, list: null, loading: false }; editing = false; }
    if (!mine) editing = true;

    root.innerHTML = `
    <article class="visit">
      <a class="back" href="#/lugar/${esc(v.placeId)}">${icon('fa-arrow-left')} ${esc(p?.name || 'Lugar')}</a>
      <header class="visit-head">
        <div>
          <p class="eyebrow">${kind(v.kind).label === 'Delivery' ? 'Pedido' : 'Visita'} nº ${nth} · ${esc(fmtDateLong(v.date))}</p>
          <h1 class="title">${esc(p?.name || '')}</h1>
          <div class="visit-tags">${kindBadge(v.kind)}${occasionTag(v.occasion)}${typeof v.spent === 'number' ? `<span class="tag">${icon('fa-receipt')}${esc(fmtMoney(v.spent))}</span>` : ''}</div>
        </div>
        <div class="visit-head-score">
          <span class="stat-label">Média do casal</span>
          ${mine || !v.avg ? score(v.avg, 'score-xl') : `<span class="score score-xl s-none">${icon('fa-lock')}</span>`}
        </div>
      </header>

      <section class="card card-pad">
        <div class="card-title-row"><h3 class="card-title">Detalhes</h3>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-edit>${icon('fa-pen')} Editar</button>
            <button class="btn-icon" data-delv aria-label="Excluir registro">${icon('fa-trash')}</button>
          </div></div>
        <dl class="details">
          <div><dt>${icon('fa-bowl-food')} O que pedimos</dt><dd>${v.ordered ? esc(v.ordered) : '<span class="faint">—</span>'}</dd></div>
          <div><dt>${icon('fa-feather')} Observações</dt><dd>${v.notes ? esc(v.notes) : '<span class="faint">—</span>'}</dd></div>
        </dl>
      </section>

      <section class="section">
        <div class="section-head"><h2>Avaliações</h2>${!mine ? `<span class="tag tag-wish">${icon('fa-eye-slash')} Nota às cegas: avalie para ver a do outro</span>` : ''}</div>
        <div class="ratings">
          ${members.map(m => {
            const r = v.ratings?.[m.uid];
            const isMe = m.uid === uid;
            let body;
            if (isMe) body = editing ? ratingForm(v, r) : ratingView(r, v, m);
            else if (!r) body = `<div class="rating-wait">${icon('fa-hourglass-half')}<p>${esc(m.name.split(' ')[0])} ainda não avaliou.</p></div>`;
            else if (!mine) body = `<div class="rating-wait locked">${icon('fa-lock')}<p>${esc(m.name.split(' ')[0])} já avaliou. Dê sua nota para revelar.</p></div>`;
            else body = ratingView(r, v, m);
            return `<div class="rating-card" style="--pc:${esc(m.color)}">
              <div class="rating-head"><span class="rh-name"><i></i>${esc(m.name)}${isMe ? ' <small>(você)</small>' : ''}</span>
                ${isMe && mine && !editing ? `<button class="btn btn-ghost btn-sm" data-editrate>${icon('fa-pen')} Editar</button>` : ''}</div>
              ${body}</div>`;
          }).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Fotos</h2>
          <label class="btn btn-ghost btn-sm">${icon('fa-camera')} Adicionar
            <input type="file" accept="image/*" multiple hidden data-addph></label></div>
        <div data-photos>${photosBlock(v)}</div>
      </section>
    </article>`;

    // ── eventos ──
    root.querySelector('[data-edit]').addEventListener('click', () => editInfoModal(v));
    root.querySelector('[data-delv]').addEventListener('click', async () => {
      if (!(await confirmDialog('Excluir este registro, as notas e as fotos dele?', { title: 'Excluir registro', okText: 'Excluir', danger: true }))) return;
      try { await deleteVisit(v.id); toast('Registro excluído.'); navigate('lugar/' + v.placeId); }
      catch (e) { toast(friendlyError(e), 'error'); }
    });
    root.querySelector('[data-editrate]')?.addEventListener('click', () => { editing = true; rerender(); });

    ctx = { v, p };
    paintPhotos();

    root.querySelector('[data-addph]').addEventListener('change', async (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!files.length) return;
      const kindKey = await askPhotoKind();
      if (!kindKey) return;
      const box = root.querySelector('[data-photos]');
      box.insertAdjacentHTML('afterbegin', `<p class="muted" data-prog><span class="spinner"></span> Preparando fotos…</p>`);
      try {
        const processed = [];
        for (const f of files) processed.push({ ...(await processPhoto(f)), kind: kindKey });
        await addPhotos(v, processed, (i, n) => { const el = root.querySelector('[data-prog]'); if (el) el.innerHTML = `<span class="spinner"></span> Enviando ${i}/${n}…`; });
        toast(processed.length === 1 ? 'Foto adicionada.' : `${processed.length} fotos adicionadas.`);
        photoState.list = null; loadPhotos(v);
      } catch (err) { toast(friendlyError(err), 'error'); root.querySelector('[data-prog]')?.remove(); }
    });

    const need = photoState.list === null ? !!v.photoCount : photoState.list.length !== (v.photoCount || 0);
    if (need && !photoState.loading) loadPhotos(v);

    const form = root.querySelector('[data-rating-form]');
    if (form) bindRatingForm(form, v, mine);
  }
};

function askPhotoKind() {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title: 'Essas fotos são de…',
      body: `<div class="kind-pick">${Object.entries(PHOTO_KINDS).map(([k, o]) => `<button class="btn btn-ghost" data-k="${k}">${icon(o.icon)} ${esc(o.label)}</button>`).join('')}</div>`,
      onClose: () => { if (!done) resolve(null); }
    });
    m.el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { done = true; resolve(b.dataset.k); m.close(); }));
  });
}

function bindRatingForm(form, v, mine) {
  const live = form.querySelector('[data-live]');
  let ret = mine?.voltaria || 'sim';
  const read = () => {
    const scores = {};
    form.querySelectorAll('[data-crit]').forEach(row => {
      const na = row.querySelector('.na-toggle input').checked;
      scores[row.dataset.crit] = na ? null : Number(row.querySelector('input[type=range]').value);
    });
    return scores;
  };
  const update = () => {
    const a = ratingAvg({ scores: read() }, v.kind);
    live.className = `score ${scoreTier(a)}`;
    live.textContent = fmtScore(a);
  };
  form.querySelectorAll('[data-crit]').forEach(row => {
    const range = row.querySelector('input[type=range]');
    const na = row.querySelector('.na-toggle input');
    const out = row.querySelector('[data-val]');
    const paint = () => {
      const val = Number(range.value);
      range.style.setProperty('--p', `${val * 10}%`);
      out.textContent = na.checked ? 'N/A' : fmtScore(val);
      out.className = `crit-val ${na.checked ? 's-none' : scoreTier(val)}`;
    };
    range.addEventListener('input', () => { paint(); update(); });
    na.addEventListener('change', () => { range.disabled = na.checked; row.classList.toggle('is-na', na.checked); paint(); update(); });
    paint();
  });
  form.querySelectorAll('[data-return] button').forEach(b => b.addEventListener('click', () => {
    ret = b.dataset.v;
    form.querySelectorAll('[data-return] button').forEach(x => x.classList.toggle('active', x === b));
  }));
  form.querySelector('[data-cancel]')?.addEventListener('click', () => { editing = false; rerender(); });
  update();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const scores = read();
    if (!Object.values(scores).some(x => typeof x === 'number')) return toast('Dê nota para pelo menos um critério.', 'error');
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true, 'Salvando…');
    try {
      await saveRating(v.id, { scores, voltaria: ret, comment: clampStr(form.comment.value, 600), at: Date.now() });
      editing = false;
      toast('Nota salva!');
      rerender();
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy(btn, false);
    }
  });
}
