import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import * as FirebaseAuth from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const firebaseConfigured = Object.values(config).every(Boolean);

type Persistence = NonNullable<Parameters<typeof FirebaseAuth.initializeAuth>[1]>['persistence'];
type ReactNativeAuthModule = typeof FirebaseAuth & { getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence };

let app: FirebaseApp | undefined;
let auth: FirebaseAuth.Auth | undefined;
let database: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) throw new Error('Firebase is not configured.');
  app ??= getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirebaseAuth(): FirebaseAuth.Auth {
  if (auth) return auth;
  const authModule = FirebaseAuth as ReactNativeAuthModule;
  try {
    auth = FirebaseAuth.initializeAuth(getFirebaseApp(), { persistence: authModule.getReactNativePersistence(AsyncStorage) });
  } catch {
    auth = FirebaseAuth.getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  database ??= getFirestore(getFirebaseApp());
  return database;
}
