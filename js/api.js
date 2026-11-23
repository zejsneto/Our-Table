// Camada de dados: tudo que lê/escreve no Firestore passa por aqui
import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit, startAfter, serverTimestamp, writeBatch, Timestamp
} from './firebase.js';
import { store, setState, getPlace, getVisit, myUid } from './store.js';
import { placeStats, coupleAvg } from './stats.js';
import { round2, normalize } from './utils.js';

const col = (name) => collection(db, name);
let unsubs = [];

// ── Sincronização em tempo real ──
export async function loadMembers() {
  const snap = await getDocs(col('members'));
  const members = {};
  snap.forEach(d => { members[d.id] = d.data(); });
  setState({ members });
}

function unsubscribeAll() {
  unsubs.forEach(u => u && u());
  unsubs = [];
}

export function startSync(onError) {
  unsubscribeAll();
  unsubs.push(onSnapshot(col('places'), (snap) => {
    setState({ places: snap.docs.map(d => ({ id: d.id, ...d.data() })), placesReady: true });
  }, onError));
  unsubs.push(onSnapshot(col('visits'), (snap) => {
    setState({ visits: snap.docs.map(d => ({ id: d.id, ...d.data() })), visitsReady: true });
  }, onError));
}
export function stopSync() {
  unsubscribeAll();
  setState({ places: [], visits: [], members: {}, placesReady: false, visitsReady: false });
}

export async function isMember(uid) {
  try {
    const s = await getDoc(doc(db, 'members', uid));
    return s.exists();
  } catch (e) {
    if (e?.code === 'permission-denied') return false;
    throw e;
  }
}

// ── Lugares ──
function cleanPlace(data) {
  const out = { ...data };
  out.name = String(out.name || '').trim().slice(0, 120);
  out.nameLower = normalize(out.name);
  return out;
}

export async function createPlace(data) {
  const ref = doc(col('places'));
  await setDoc(ref, {
    ...cleanPlace(data),
    stats: { avg: null, visits: 0, rated: 0, lastVisit: null, firstVisit: null, lastReturn: null, byPerson: {}, criteria: {}, spent: null },
    createdBy: myUid(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updatePlace(id, data) {
  const patch = { ...data, updatedAt: serverTimestamp() };
  if ('name' in data) Object.assign(patch, cleanPlace({ name: data.name }));
  await updateDoc(doc(db, 'places', id), patch);
}

export async function deletePlace(id) {
  const [visits, photos] = await Promise.all([
    getDocs(query(col('visits'), where('placeId', '==', id))),
    getDocs(query(col('photos'), where('placeId', '==', id)))
  ]);
  for (const p of photos.docs) {
    await deleteDoc(doc(db, 'photoData', p.id)).catch(() => {});
    await deleteDoc(p.ref);
  }
  for (const v of visits.docs) await deleteDoc(v.ref);
  await deleteDoc(doc(db, 'places', id));
}

export async function recomputePlace(placeId) {
  const place = getPlace(placeId) || (await getDoc(doc(db, 'places', placeId))).data();
  if (!place) return;
  const snap = await getDocs(query(col('visits'), where('placeId', '==', placeId)));
  const visits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const stats = placeStats(visits, place.kind);
  await updateDoc(doc(db, 'places', placeId), { stats, updatedAt: serverTimestamp() });
}

export async function recomputeAll(onProgress) {
  const snap = await getDocs(col('places'));
  let i = 0;
  for (const d of snap.docs) {
    await recomputePlace(d.id);
    onProgress && onProgress(++i, snap.size);
  }
}

// ── Visitas ──
export async function createVisit(data) {
  const ref = doc(col('visits'));
  await setDoc(ref, {
    placeId: data.placeId,
    kind: data.kind,
    date: data.date,
    occasion: data.occasion || 'casual',
    ordered: data.ordered || '',
    notes: data.notes || '',
    spent: typeof data.spent === 'number' ? data.spent : null,
    ratings: {},
    avg: null,
    photoCount: 0,
    createdBy: myUid(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateVisit(id, data) {
  await updateDoc(doc(db, 'visits', id), { ...data, updatedAt: serverTimestamp() });
  const v = getVisit(id);
  if (v) await recomputePlace(v.placeId);
}

export async function deleteVisit(id) {
  const v = getVisit(id);
  const photos = await getDocs(query(col('photos'), where('visitId', '==', id)));
  for (const p of photos.docs) {
    await deleteDoc(doc(db, 'photoData', p.id)).catch(() => {});
    await deleteDoc(p.ref);
  }
  await deleteDoc(doc(db, 'visits', id));
  if (v) await recomputePlace(v.placeId);
}

// Cada pessoa grava APENAS a sua nota (as regras do Firestore garantem isso)
export async function saveRating(visitId, rating) {
  const uid = myUid();
  const v = getVisit(visitId);
  if (!v) throw new Error('Visita não encontrada.');
  const ratings = { ...(v.ratings || {}), [uid]: rating };
  const avg = round2(coupleAvg(ratings, v.kind));
  await updateDoc(doc(db, 'visits', visitId), {
    [`ratings.${uid}`]: rating,
    avg,
    updatedAt: serverTimestamp()
  });
  await recomputePlace(v.placeId);
}

// ── Fotos (base64 no Firestore: miniatura em "photos", original em "photoData") ──
export async function addPhotos(visit, photos, onProgress) {
  let i = 0;
  const added = [];
  for (const p of photos) {
    const ref = doc(col('photos'));
    await setDoc(doc(db, 'photoData', ref.id), { data: p.full, visitId: visit.id, placeId: visit.placeId });
    await setDoc(ref, {
      thumb: p.thumb, kind: p.kind || 'lugar',
      visitId: visit.id, placeId: visit.placeId, date: visit.date,
      createdBy: myUid(), createdAt: serverTimestamp()
    });
    added.push({ id: ref.id, thumb: p.thumb, kind: p.kind });
    onProgress && onProgress(++i, photos.length);
  }
  const count = (await getDocs(query(col('photos'), where('visitId', '==', visit.id)))).size;
  await updateDoc(doc(db, 'visits', visit.id), { photoCount: count });
  // Capa automática se o lugar ainda não tiver
  const place = getPlace(visit.placeId) || (await getDoc(doc(db, 'places', visit.placeId))).data();
  if (added.length && place && !place.cover) {
    const pick = added.find(a => a.kind === 'lugar') || added.find(a => a.kind === 'prato') || added[0];
    await updateDoc(doc(db, 'places', visit.placeId), { cover: pick.thumb });
  }
  return added;
}

export async function listPhotos(field, id) {
  const snap = await getDocs(query(col('photos'), where(field, '==', id)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
}

export async function listPhotosPage(cursor, size = 30) {
  const q = cursor
    ? query(col('photos'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(size))
    : query(col('photos'), orderBy('createdAt', 'desc'), limit(size));
  const snap = await getDocs(q);
  return {
    items: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    cursor: snap.docs[snap.docs.length - 1] || null,
    done: snap.size < size
  };
}

export async function getPhotoFull(id) {
  const s = await getDoc(doc(db, 'photoData', id));
  return s.exists() ? s.data().data : null;
}

export async function deletePhoto(photo) {
  await deleteDoc(doc(db, 'photoData', photo.id)).catch(() => {});
  await deleteDoc(doc(db, 'photos', photo.id));
  const count = (await getDocs(query(col('photos'), where('visitId', '==', photo.visitId)))).size;
  await updateDoc(doc(db, 'visits', photo.visitId), { photoCount: count }).catch(() => {});
}

export const setPlaceCover = (placeId, thumb) => updateDoc(doc(db, 'places', placeId), { cover: thumb, updatedAt: serverTimestamp() });

// ── Backup ──
function encode(v) {
  if (v instanceof Timestamp) return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
  return v;
}
function decode(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.__ts === 'number' && Object.keys(v).length === 1) return Timestamp.fromMillis(v.__ts);
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)]));
  return v;
}

export async function exportBackup(includePhotos, onProgress) {
  const names = ['places', 'visits', 'photos'];
  if (includePhotos) names.push('photoData');
  const out = { app: 'our-table', version: 1, exportedAt: new Date().toISOString(), includePhotos };
  for (const n of names) {
    onProgress && onProgress(`Lendo ${n}…`);
    const snap = await getDocs(col(n));
    out[n] = snap.docs.map(d => ({ id: d.id, ...encode(d.data()) }));
  }
  return out; // as miniaturas (photos) sempre vão junto; os originais só com includePhotos
}

export async function importBackup(data, onProgress) {
  if (!data || data.app !== 'our-table') throw new Error('Arquivo não é um backup do Our Table.');
  const result = { ok: 0, skipped: 0 };
  const writeOne = async (name, item) => {
    const { id, ...rest } = item;
    if (!id || typeof id !== 'string' || id.includes('/')) { result.skipped++; return; }
    try { await setDoc(doc(db, name, id), decode(rest)); result.ok++; }
    catch (e) { result.skipped++; }
  };
  for (const name of ['places', 'visits', 'photos']) {
    const items = Array.isArray(data[name]) ? data[name] : [];
    // Lotes de 200 (mais rápido); se um lote falhar, grava um por um
    for (let i = 0; i < items.length; i += 200) {
      const chunk = items.slice(i, i + 200);
      onProgress && onProgress(`Restaurando ${name}: ${Math.min(i + 200, items.length)}/${items.length}`);
      try {
        const batch = writeBatch(db);
        let n = 0;
        for (const it of chunk) {
          const { id, ...rest } = it;
          if (!id || typeof id !== 'string' || id.includes('/')) { result.skipped++; continue; }
          batch.set(doc(db, name, id), decode(rest)); n++;
        }
        await batch.commit();
        result.ok += n;
      } catch (e) {
        for (const it of chunk) await writeOne(name, it);
      }
    }
  }
  const pd = Array.isArray(data.photoData) ? data.photoData : [];
  for (let i = 0; i < pd.length; i++) {
    onProgress && onProgress(`Restaurando fotos: ${i + 1}/${pd.length}`);
    await writeOne('photoData', pd[i]);
  }
  onProgress && onProgress('Recalculando médias…');
  await recomputeAll();
  return result;
}
