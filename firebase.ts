import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigKeys = Object.keys(firebaseConfig) as (keyof typeof firebaseConfig)[];

export function initializeFirebase() {
  const missing = requiredConfigKeys.filter(key => !firebaseConfig[key]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Set these environment variables: ${missing
        .map(key => `VITE_FIREBASE_${key.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`)
        .join(', ')}.`,
    );
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export const getFirebaseAuth = () => getAuth(initializeFirebase());
export const getFirestoreDb = () => getFirestore(initializeFirebase());
export const getFirebaseStorage = () => getStorage(initializeFirebase());

export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  return Notification.requestPermission();
};
