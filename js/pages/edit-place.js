import { getPlace, visitsOf, store } from '../store.js';
import { updatePlace, updateVisit, recomputePlace } from '../api.js';
import { esc, toast, friendlyError, setBusy, clampStr, processCover, normalize } from '../utils.js';
import { icon, pageHead, cover, emptyState, kind } from '../ui.js';
import { placeFieldsHTML, bindPlaceFields, readPlaceFields } from '../place-form.js';
import { navigate } from '../router.js';

let busy = false;

export default {
  title: 'Editar lugar',
  live: false,
  isBusy: () => busy,
  render(root, { id }) {
    const p = getPlace(id);
    if (!p) { root.innerHTML = emptyState('fa-circle-question', 'Lugar não encontrado'); return; }
    let newCover = undefined;

    root.innerHTML = `
      <a class="back" href="#/lugar/${esc(p.id)}">${icon('fa-arrow-left')} ${esc(p.name)}</a>
      ${pageHead('Editar lugar')}
      <form class="form add-form" novalidate>
        <section class="card card-pad">
          <div class="cover-edit">
            <div class="cover-edit-img" data-cover>${cover(p)}</div>
            <div>
              <label class="btn btn-ghost btn-sm">${icon('fa-image')} Trocar capa<input type="file" accept="image/*" hidden data-coverfile></label>
              ${p.cover ? `<button type="button" class="link-btn" data-rmcover>Remover capa</button>` : ''}
              <p class="hint">Dica: na foto de uma visita, toque em "Usar como capa".</p>
            </div>
          </div>
          <label class="field"><span>Nome</span><input name="name" maxlength="120" value="${esc(p.name)}" required></label>
          ${placeFieldsHTML(p)}
          <label class="check wish-check">
            <input type="checkbox" name="wish" ${p.wishlist ? 'checked' : ''}>
            <span class="check-box">${icon('fa-check')}</span>
            <span><strong>Na lista "${esc(kind(p.kind).wish)}"</strong><small>Desmarque quando já tiverem ido.</small></span>
          </label>
        </section>
        <div class="form-actions sticky-actions">
          <a class="btn btn-ghost" href="#/lugar/${esc(p.id)}">Cancelar</a>
          <button type="submit" class="btn btn-primary">${icon('fa-check')} Salvar</button>
        </div>
      </form>`;

    const form = root.querySelector('form');
    bindPlaceFields(form, () => form.name.value.trim());

    root.querySelector('[data-coverfile]').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try {
        newCover = await processCover(f);
        root.querySelector('[data-cover]').innerHTML = `<img class="cover" src="${newCover}" alt="">`;
      } catch (err) { toast(err.message, 'error'); }
    });
    root.querySelector('[data-rmcover]')?.addEventListener('click', () => {
      newCover = null;
      root.querySelector('[data-cover]').innerHTML = cover({ ...p, cover: null });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = clampStr(form.name.value, 120);
      if (!name) return toast('Informe o nome.', 'error');
      const data = { name, ...readPlaceFields(form), wishlist: form.wish.checked };
      if (!data.city) return toast('Informe a cidade.', 'error');
      const dup = store.places.find(x => x.id !== p.id && x.nameLower === normalize(name) && normalize(x.city) === normalize(data.city) && x.kind === data.kind);
      if (dup) return toast('Já existe outro lugar com esse nome nessa cidade.', 'error');
      if (newCover !== undefined) data.cover = newCover;
      const btn = form.querySelector('[type=submit]');
      busy = true; setBusy(btn, true, 'Salvando…');
      try {
        await updatePlace(p.id, data);
        // Se o tipo mudou, os registros passam a usar os critérios do novo tipo
        if (data.kind !== p.kind) {
          for (const v of visitsOf(p.id)) await updateVisit(v.id, { kind: data.kind });
          await recomputePlace(p.id);
        }
        toast('Lugar atualizado.');
        navigate('lugar/' + p.id);
      } catch (err) { toast(friendlyError(err), 'error'); setBusy(btn, false); }
      finally { busy = false; }
    });
  }
};
