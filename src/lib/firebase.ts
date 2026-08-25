import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  updateProfile,
  User as FirebaseUser,
  IdTokenResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBd2HY-2ICcxHb_9cjFNPJLWo2rCXGY_E0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "troxinh-eb.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "troxinh-eb",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "troxinh-eb.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "65991425256",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:65991425256:web:c176f9974437b31d6c1d5d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8Z6N1ZQ5GW"
};

let app: FirebaseApp;
let auth: Auth;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
} catch (error) {
  console.warn('[Firebase] Auth initialization error:', error);
  app = {} as FirebaseApp;
  auth = {} as Auth;
}

export {
  app,
  auth,
  googleProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  updateProfile,
  firebaseConfig,
};
export type { ConfirmationResult, FirebaseUser, IdTokenResult };

