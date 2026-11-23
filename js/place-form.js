// Campos do lugar (usados no cadastro e na edição) + busca opcional no OpenStreetMap
import { APP, CATEGORIES } from './config.js';
import { esc, clampStr, toast } from './utils.js';
import { icon, optionList } from './ui.js';

export function placeFieldsHTML(v = {}) {
  const k = v.kind || 'restaurante';
  return `
  <div class="field">
    <span>Tipo</span>
    <div class="seg seg-full" data-kindseg>
      <button type="button" data-v="restaurante" class="${k === 'restaurante' ? 'active' : ''}">${icon('fa-utensils')} Restaurante</button>
      <button type="button" data-v="delivery" class="${k === 'delivery' ? 'active' : ''}">${icon('fa-motorcycle')} Delivery</button>
    </div>
    <input type="hidden" name="kind" value="${esc(k)}">
  </div>
  <label class="field"><span>Tipo de comida</span>
    <select name="category" required>${optionList(CATEGORIES, v.category || '', { placeholder: 'Escolha…' })}</select></label>
  <div class="row row-3">
    <label class="field"><span>Cidade</span><input name="city" maxlength="80" value="${esc(v.city ?? APP.defaultCity)}" required></label>
    <label class="field"><span>Estado</span><input name="state" maxlength="40" value="${esc(v.state ?? APP.defaultState)}"></label>
    <label class="field"><span>País</span><input name="country" maxlength="60" value="${esc(v.country ?? APP.defaultCountry)}"></label>
  </div>
  <label class="field"><span>Endereço (opcional)</span>
    <div class="input-icon">
      <input name="address" maxlength="200" value="${esc(v.address || '')}" placeholder="Rua, número, bairro">
      <button type="button" class="btn-icon" data-osm title="Buscar endereço no OpenStreetMap" aria-label="Buscar endereço">${icon('fa-map-location-dot')}</button>
    </div>
    <small class="hint">Toque no ícone para buscar o endereço e a localização no mapa (OpenStreetMap, gratuito).</small>
  </label>
  <input type="hidden" name="lat" value="${typeof v.lat === 'number' ? v.lat : ''}">
  <input type="hidden" name="lng" value="${typeof v.lng === 'number' ? v.lng : ''}">
  <div class="osm-results" data-osm-results hidden></div>
  <p class="hint" data-coords>${typeof v.lat === 'number' ? `${icon('fa-location-crosshairs')} Localização salva no mapa` : ''}</p>
  <label class="field"><span>Link (Instagram, iFood, site — opcional)</span>
    <input name="link" type="url" maxlength="300" value="${esc(v.link || '')}" placeholder="https://"></label>
  <label class="field"><span>Descrição (opcional)</span>
    <textarea name="description" rows="2" maxlength="600" placeholder="Uma frase sobre o lugar">${esc(v.description || '')}</textarea></label>`;
}

export function bindPlaceFields(form, getName) {
  const seg = form.querySelector('[data-kindseg]');
  seg?.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    form.kind.value = b.dataset.v;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    form.dispatchEvent(new CustomEvent('kindchange', { detail: b.dataset.v }));
  }));

  const box = form.querySelector('[data-osm-results]');
  form.querySelector('[data-osm]')?.addEventListener('click', async () => {
    const name = getName();
    const q = [name, form.address.value, form.city.value, form.state.value, form.country.value].filter(Boolean).join(', ');
    if (!q.trim()) return toast('Digite o nome ou o endereço primeiro.', 'info');
    box.hidden = false;
    box.innerHTML = `<p class="muted"><span class="spinner"></span> Buscando…</p>`;
    try {
      let results = await nominatim(q);
      if (!results.length && name) results = await nominatim([form.address.value || name, form.city.value].filter(Boolean).join(', '));
      if (!results.length) { box.innerHTML = `<p class="muted">Nada encontrado. Preencha manualmente — tudo bem!</p>`; return; }
      box.innerHTML = results.map((r, i) => `<button type="button" class="osm-item" data-i="${i}">${icon('fa-location-dot')}<span>${esc(r.display_name)}</span></button>`).join('')
        + `<button type="button" class="link-btn" data-osm-close>Fechar</button>`;
      box.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => {
        const r = results[Number(b.dataset.i)];
        const a = r.address || {};
        const street = [a.road, a.house_number].filter(Boolean).join(', ');
        form.address.value = [street, a.suburb || a.neighbourhood].filter(Boolean).join(' · ') || r.display_name.split(',').slice(0, 2).join(',');
        form.city.value = a.city || a.town || a.village || a.municipality || form.city.value;
        const iso = a['ISO3166-2-lvl4'];
        form.state.value = iso ? iso.split('-')[1] : (a.state || form.state.value);
        form.country.value = a.country || form.country.value;
        form.lat.value = r.lat; form.lng.value = r.lon;
        form.querySelector('[data-coords]').innerHTML = `${icon('fa-location-crosshairs')} Localização salva no mapa`;
        box.hidden = true;
      }));
      box.querySelector('[data-osm-close]').addEventListener('click', () => { box.hidden = true; });
    } catch (e) {
      box.innerHTML = `<p class="muted">Não foi possível buscar agora. Preencha manualmente.</p>`;
    }
  });
}

async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=pt-BR&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('OSM indisponível');
  return res.json();
}

export function readPlaceFields(form) {
  const lat = parseFloat(form.lat.value), lng = parseFloat(form.lng.value);
  let link = form.link.value.trim();
  if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
  return {
    kind: form.kind.value === 'delivery' ? 'delivery' : 'restaurante',
    category: form.category.value || 'outra',
    city: clampStr(form.city.value, 80),
    state: clampStr(form.state.value, 40),
    country: clampStr(form.country.value, 60),
    address: clampStr(form.address.value, 200),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    link: clampStr(link, 300),
    description: clampStr(form.description.value, 600)
  };
}

