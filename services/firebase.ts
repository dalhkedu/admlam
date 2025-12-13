import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Safe environment variable access
// Prevents crash if import.meta.env is undefined in some environments
// Cast import.meta to any to avoid TypeScript errors if vite types are missing
const env = (import.meta as any).env || {};

// Configuração com Fallback para garantir funcionamento imediato
// Os valores à direita do || serão usados se o .env falhar ou não existir
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCYMaKP81uYn7xM4uBCL2d8v7vh6oUtHDU",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "lar-matilde-admin.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "lar-matilde-admin",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "lar-matilde-admin.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "166780880362",
  appId: env.VITE_FIREBASE_APP_ID || "1:166780880362:web:3ca2df5830bdee278c5e93",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-X92NEKB3GM"
};

// Validação de Segurança para Debug
if (!firebaseConfig.apiKey) {
  console.error("CRÍTICO: A API Key do Firebase não foi encontrada!");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };