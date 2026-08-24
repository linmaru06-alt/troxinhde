import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyTroxinhVietnam2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'troxinh-prod.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'troxinh-prod',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'troxinh-prod.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '10888110789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:10888110789:web:abcdef123456',
};

let app: FirebaseApp;
let auth: Auth;

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
} catch (error) {
  console.warn('[Firebase] Auth initialization fallback:', error);
  app = {} as FirebaseApp;
  auth = {} as Auth;
}

export { app, auth, RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult };
