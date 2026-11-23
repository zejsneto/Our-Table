import { store, getPlace } from '../store.js';
import { createPlace, updatePlace, createVisit, addPhotos, recomputePlace } from '../api.js';
import { esc, normalize, todayStr, toast, friendlyError, setBusy, processPhoto, clampStr, safeImg, fmtDate } from '../utils.js';
import { icon, pageHead, cover, category, kind, locationLine, optionList } from '../ui.js';
import { placeFieldsHTML, bindPlaceFields, readPlaceFields } from '../place-form.js';
import { OCCASIONS, PHOTO_KINDS, KINDS } from '../config.js';
import { navigate } from '../router.js';

let busy = false;

export default {
  title: 'Novo registro',
  live: false,
  isBusy: () => busy,
  render(root, _params, query) {
    busy = false;
    let selected = query.place ? getPlace(query.place) : null;
    let photos = []; // { full, thumb, kind }
    const startKind = selected?.kind || (query.kind === 'delivery' ? 'delivery' : 'restaurante');

    root.innerHTML = `
      ${pageHead('Novo registro', 'Um lugar novo ou mais uma vez num lugar conhecido')}
      <form class="form add-form" novalidate>
        <section class="card card-pad">
          <h3 class="card-title">${icon('fa-store')} Lugar</h3>
          <div data-selected></div>
          <div data-new>
            <label class="field ac-wrap"><span>Nome</span>
              <input name="name" maxlength="120" autocomplete="off" placeholder="Ex.: Temakeria Sushi Bar" required>
              <div class="ac-list" data-ac hidden></div>
            </label>
            <div data-placefields>${placeFieldsHTML({ kind: startKind })}</div>
            <label class="check wish-check">
              <input type="checkbox" name="wish" ${query.wish ? 'checked' : ''}>
              <span class="check-box">${icon('fa-check')}</span>
              <span><strong data-wishlabel>Ainda não fomos — salvar em "${esc(KINDS[startKind].wish)}"</strong>
              <small>Fica na lista de desejos, sem data nem nota.</small></span>
            </label>
          </div>
        </section>

        <section class="card card-pad" data-visit>
          <h3 class="card-title">${icon('fa-calendar-day')} <span data-visittitle>${startKind === 'delivery' ? 'Pedido' : 'Visita'}</span></h3>
          <div class="row">
            <label class="field"><span>Data</span><input type="date" name="date" value="${todayStr()}" max="${todayStr()}" required></label>
            <label class="field"><span>Ocasião</span><select name="occasion">${optionList(OCCASIONS, 'casual')}</select></label>
          </div>
          <label class="field"><span>O que pedimos</span><textarea name="ordered" rows="2" maxlength="1000" placeholder="Pratos, bebidas, sobremesa…"></textarea></label>
          <label class="field"><span>Quanto gastamos (R$, opcional)</span><input type="number" name="spent" min="0" step="0.01" inputmode="decimal" placeholder="0,00"></label>
          <label class="field"><span>Observações</span><textarea name="notes" rows="3" maxlength="2000" placeholder="Como foi a experiência?"></textarea></label>

          <div class="field">
            <span>Fotos</span>
            <div class="photo-picker" data-picker></div>
            <label class="btn btn-ghost">${icon('fa-camera')} Escolher fotos
              <input type="file" accept="image/*" multiple hidden data-files></label>
            <small class="hint">As fotos são comprimidas no seu aparelho antes de enviar. Marque se é do lugar, do prato ou de vocês.</small>
          </div>
          <p class="hint">${icon('fa-star-half-stroke')} Depois de salvar, cada um entra e dá a sua nota.</p>
        </section>

        <div class="form-actions sticky-actions">
          <a class="btn btn-ghost" href="javascript:history.back()">Cancelar</a>
          <button type="submit" class="btn btn-primary">${icon('fa-check')} Salvar</button>
        </div>
      </form>`;

    const form = root.querySelector('form');
    const selBox = root.querySelector('[data-selected]');
    const newBox = root.querySelector('[data-new]');
    const visitBox = root.querySelector('[data-visit]');
    const ac = root.querySelector('[data-ac]');

    const currentKind = () => selected ? selected.kind : form.kind.value;
    const syncKindLabels = () => {
      const k = currentKind();
      root.querySelector('[data-wishlabel]').textContent = `Ainda não ${k === 'delivery' ? 'pedimos' : 'fomos'} — salvar em "${KINDS[k].wish}"`;
      root.querySelector('[data-visittitle]').textContent = k === 'delivery' ? 'Pedido' : 'Visita';
    };
    const syncWish = () => { visitBox.hidden = !selected && form.wish.checked; };

    const paintSelected = () => {
      if (!selected) { selBox.innerHTML = ''; newBox.hidden = false; syncWish(); syncKindLabels(); return; }
      newBox.hidden = true;
      const s = selected.stats || {};
      selBox.innerHTML = `
        <div class="selected-place">
          <div class="list-thumb">${cover(selected)}</div>
          <div class="list-main">
            <div class="list-title">${esc(selected.name)}</div>
            <div class="list-sub">${icon(kind(selected.kind).icon)} ${esc(kind(selected.kind).label)} · ${esc(category(selected.category).label)} · ${locationLine(selected)}</div>
            <div class="list-sub faint">${selected.wishlist ? `${icon('fa-bookmark')} Sai da lista "${esc(kind(selected.kind).wish)}" ao salvar` : `${s.visits || 0} registro(s) · última ${esc(fmtDate(s.lastVisit))}`}</div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-change>Trocar</button>
        </div>`;
      selBox.querySelector('[data-change]').addEventListener('click', () => { selected = null; paintSelected(); form.name.focus(); });
      syncWish(); syncKindLabels();
    };

    bindPlaceFields(form, () => form.name.value.trim());
    form.addEventListener('kindchange', syncKindLabels);
    form.wish.addEventListener('change', syncWish);

    // Autocompletar com lugares já cadastrados (evita duplicar)
    form.name.addEventListener('input', () => {
      const q = normalize(form.name.value);
      if (q.length < 2) { ac.hidden = true; return; }
      const hits = store.places.filter(p => p.nameLower?.includes(q)).slice(0, 6);
      if (!hits.length) { ac.hidden = true; return; }
      ac.hidden = false;
      ac.innerHTML = `<small class="ac-head">Já cadastrados</small>` + hits.map(p => `
        <button type="button" class="ac-item" data-id="${esc(p.id)}">
          <span class="ac-thumb">${cover(p)}</span>
          <span><strong>${esc(p.name)}</strong><small>${esc(kind(p.kind).label)} · ${locationLine(p)}</small></span>
        </button>`).join('');
      ac.querySelectorAll('[data-id]').forEach(b => b.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selected = getPlace(b.dataset.id); ac.hidden = true; paintSelected();
      }));
    });
    form.name.addEventListener('blur', () => setTimeout(() => { ac.hidden = true; }, 150));

    // Fotos
    const picker = root.querySelector('[data-picker]');
    const paintPhotos = () => {
      picker.innerHTML = photos.map((ph, i) => `
        <div class="pick-item">
          ${ph.thumb ? `<img src="${safeImg(ph.thumb)}" alt="">` : `<div class="skeleton"></div>`}
          <select data-pk="${i}" aria-label="Tipo da foto">${Object.entries(PHOTO_KINDS).map(([k, o]) => `<option value="${k}" ${ph.kind === k ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
          <button type="button" class="pick-del" data-rm="${i}" aria-label="Remover">${icon('fa-xmark')}</button>
        </div>`).join('');
      picker.querySelectorAll('[data-pk]').forEach(s => s.addEventListener('change', () => { photos[Number(s.dataset.pk)].kind = s.value; }));
      picker.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { photos.splice(Number(b.dataset.rm), 1); paintPhotos(); }));
    };
    root.querySelector('[data-files]').addEventListener('change', async (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      for (const f of files) {
        const slot = { full: null, thumb: null, kind: 'lugar', pending: true };
        photos.push(slot); paintPhotos();
        try { Object.assign(slot, await processPhoto(f), { pending: false }); }
        catch (err) { photos.splice(photos.indexOf(slot), 1); toast(err.message, 'error'); }
        paintPhotos();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      const btn = form.querySelector('[type=submit]');
      const wishOnly = !selected && form.wish.checked;
      let placeData = null;

      if (!selected) {
        const name = clampStr(form.name.value, 120);
        if (!name) return toast('Informe o nome do lugar.', 'error');
        placeData = { name, ...readPlaceFields(form) };
        if (!form.category.value) return toast('Escolha o tipo de comida.', 'error');
        if (!placeData.city) return toast('Informe a cidade.', 'error');
        const dup = store.places.find(p => p.nameLower === normalize(name) && normalize(p.city) === normalize(placeData.city) && p.kind === placeData.kind);
        if (dup) { selected = dup; paintSelected(); return toast('Esse lugar já existe — selecionei ele pra você. Confira e salve de novo.', 'info'); }
      }
      if (!wishOnly && !form.date.value) return toast('Informe a data.', 'error');
      if (photos.some(p => p.pending)) return toast('Aguarde as fotos terminarem de carregar.', 'info');

      busy = true;
      setBusy(btn, true, 'Salvando…');
      try {
        let placeId = selected?.id;
        const k = selected ? selected.kind : placeData.kind;
        if (!placeId) placeId = await createPlace({ ...placeData, wishlist: wishOnly, cover: null });
        if (wishOnly) {
          toast(`Salvo em "${KINDS[k].wish}".`);
          navigate('quero');
          return;
        }
        if (selected?.wishlist) await updatePlace(placeId, { wishlist: false });
        const spent = form.spent.value === '' ? null : Math.max(0, Number(form.spent.value));
        const visitId = await createVisit({
          placeId, kind: k,
          date: form.date.value,
          occasion: form.occasion.value,
          ordered: clampStr(form.ordered.value, 1000),
          notes: clampStr(form.notes.value, 2000),
          spent: Number.isFinite(spent) ? spent : null
        });
        if (photos.length) {
          setBusy(btn, true, 'Enviando fotos…');
          await addPhotos({ id: visitId, placeId, date: form.date.value }, photos,
            (i, n) => setBusy(btn, true, `Fotos ${i}/${n}…`));
        }
        await recomputePlace(placeId);
        toast('Salvo! Agora é só cada um dar a sua nota.');
        navigate('visita/' + visitId);
      } catch (err) {
        console.error(err);
        toast(friendlyError(err), 'error');
        setBusy(btn, false);
      } finally {
        busy = false;
      }
    });

    paintSelected();
  }
};
