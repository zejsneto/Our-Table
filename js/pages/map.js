import { store } from '../store.js';
import { esc, fmtScore, scoreTier } from '../utils.js';
import { icon, pageHead, category, kind } from '../ui.js';
import { APP } from '../config.js';

let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    css.crossOrigin = '';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    s.crossOrigin = '';
    s.onload = () => resolve(window.L);
    s.onerror = () => { leafletPromise = null; reject(new Error('Não foi possível carregar o mapa.')); };
    document.head.appendChild(s);
  });
  return leafletPromise;
}

let kindFilter = '';

export default {
  title: 'Mapa',
  live: false,
  render(root) {
    const withCoords = store.places.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    const without = store.places.filter(p => !(typeof p.lat === 'number' && typeof p.lng === 'number') && !p.wishlist);

    root.innerHTML = `
      ${pageHead('Mapa', `${withCoords.length} ${withCoords.length === 1 ? 'lugar' : 'lugares'} no mapa`)}
      <div class="chips">
        <button class="chip ${!kindFilter ? 'active' : ''}" data-k="">Todos</button>
        <button class="chip ${kindFilter === 'restaurante' ? 'active' : ''}" data-k="restaurante">${icon('fa-utensils')} Restaurantes</button>
        <button class="chip ${kindFilter === 'delivery' ? 'active' : ''}" data-k="delivery">${icon('fa-motorcycle')} Delivery</button>
        <button class="chip ${kindFilter === 'wish' ? 'active' : ''}" data-k="wish">${icon('fa-bookmark')} Quero ir</button>
      </div>
      <div class="map-box" id="map"><div class="loader-page"><span class="spinner lg"></span></div></div>
      ${without.length ? `<p class="hint mt">${icon('fa-circle-info')} ${without.length} ${without.length === 1 ? 'lugar está' : 'lugares estão'} sem localização. Edite o lugar e use a busca de endereço para aparecer aqui.</p>` : ''}`;

    let map = null, layer = null;
    const draw = () => {
      if (!map) return;
      layer.clearLayers();
      const pts = [];
      withCoords.filter(p => !kindFilter || (kindFilter === 'wish' ? p.wishlist : (p.kind === kindFilter && !p.wishlist))).forEach(p => {
        const s = p.stats || {};
        const html = `<span class="map-pin ${p.wishlist ? 'pin-wish' : scoreTier(s.avg)}">${icon(p.wishlist ? 'fa-bookmark' : category(p.category).icon)}</span>`;
        const m = window.L.marker([p.lat, p.lng], { icon: window.L.divIcon({ html, className: 'pin-wrap', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }) });
        m.bindPopup(`<div class="map-pop"><strong>${esc(p.name)}</strong><small>${esc(kind(p.kind).label)} · ${esc(category(p.category).label)}</small>
          ${typeof s.avg === 'number' ? `<span class="score ${scoreTier(s.avg)}">${esc(fmtScore(s.avg))}</span>` : ''}
          <a href="#/lugar/${esc(p.id)}">Abrir ${icon('fa-arrow-right')}</a></div>`);
        layer.addLayer(m);
        pts.push([p.lat, p.lng]);
      });
      if (pts.length === 1) map.setView(pts[0], 15);
      else if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    };

    loadLeaflet().then(L => {
      const el = root.querySelector('#map');
      if (!el) return;
      el.innerHTML = '';
      map = L.map(el, { zoomControl: true }).setView(APP.mapCenter, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(map);
      layer = L.layerGroup().addTo(map);
      draw();
      setTimeout(() => map.invalidateSize(), 100);
    }).catch(e => {
      const el = root.querySelector('#map');
      if (el) el.innerHTML = `<div class="empty">${icon('fa-map')}<p>${esc(e.message)}</p></div>`;
    });

    root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      kindFilter = b.dataset.k;
      root.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('active', x === b));
      draw();
    }));

    return () => { if (map) map.remove(); };
  }
};
