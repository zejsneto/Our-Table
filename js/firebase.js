// Inicialização do Firebase (SDK modular via CDN oficial, sem build)
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit, startAfter, serverTimestamp, writeBatch, Timestamp, deleteField
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export const isConfigured = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('COLE_');

let app = null, auth = null, db = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.languageCode = 'pt';
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  try {
    // Cache local: menos leituras no Firestore e o site abre mais rápido
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e) {
    db = getFirestore(app);
  }
}

export {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit, startAfter, serverTimestamp, writeBatch, Timestamp, deleteField
};
