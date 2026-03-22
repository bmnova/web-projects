// Firebase istemci SDK — yalnızca tarayıcıda başlatılır (SSR güvenli)
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

/** Şablondan kopyalanan `<proje.firebaseapp.com>` gibi sarmalayıcıları kaldırır (geçersiz auth URL önler). */
function envFirebaseString(raw: string | undefined): string | undefined {
  if (raw == null || raw === '') return undefined
  let s = raw.trim()
  if (s.startsWith('<') && s.endsWith('>')) s = s.slice(1, -1).trim()
  return s || undefined
}

const firebaseConfig = {
  apiKey: envFirebaseString(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: envFirebaseString(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: envFirebaseString(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: envFirebaseString(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: envFirebaseString(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: envFirebaseString(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
}

let _app: FirebaseApp | undefined
let _auth: Auth | undefined
let _db: Firestore | undefined
let _storage: FirebaseStorage | undefined

export function getFirebaseApp(): FirebaseApp {
  if (!_app) _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return _app
}

export function getAuth_(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp())
  return _auth
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp())
  return _db
}

export function getStorage_(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getFirebaseApp())
  return _storage
}
