import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
if (missing.length > 0) {
  throw new Error(`Missing Firebase client configuration: ${missing.join(', ')}.`);
}

const app = getApps().length > 0 ? getApp() : initializeApp(config);

export const auth = getAuth(app);
export const firestoreDb = getFirestore(app);
export const storage = getStorage(app);
export const isFirebaseConfigured = true;
