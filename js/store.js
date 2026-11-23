// Estado em memória (sincronizado em tempo real com o Firestore)
import { MEMBER_COLORS } from './config.js';

export const store = {
  user: null,          // usuário do Firebase Auth
  members: {},         // { uid: { name, color } }
  places: [],
  visits: [],
  placesReady: false,
  visitsReady: false
};

const listeners = new Set();
let queued = false;

export function setState(patch) {
  Object.assign(store, patch);
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; listeners.forEach(fn => fn()); });
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const isReady = () => store.placesReady && store.visitsReady;

export const myUid = () => store.user?.uid;
export const getPlace = (id) => store.places.find(p => p.id === id);
export const getVisit = (id) => store.visits.find(v => v.id === id);
export const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
export const visitsOf = (placeId) => store.visits.filter(v => v.placeId === placeId).sort(byDateDesc);

export function memberList() {
  const me = myUid();
  return Object.entries(store.members)
    .map(([uid, m], i) => ({ uid, name: m.name || 'Sem nome', color: m.color || MEMBER_COLORS[i % MEMBER_COLORS.length] }))
    .sort((a, b) => (a.uid === me ? -1 : b.uid === me ? 1 : a.name.localeCompare(b.name)));
}
export const memberName = (uid) => store.members[uid]?.name || 'Alguém';
export function memberColor(uid) {
  const list = memberList();
  return list.find(m => m.uid === uid)?.color || MEMBER_COLORS[0];
}
export const firstName = (uid) => memberName(uid).split(' ')[0];

export const visitedPlaces = () => store.places.filter(p => !p.wishlist);
export const wishPlaces = () => store.places.filter(p => p.wishlist);
export const pendingVotes = () => {
  const uid = myUid();
  return store.visits.filter(v => !v.ratings || !v.ratings[uid]).sort(byDateDesc);
};
