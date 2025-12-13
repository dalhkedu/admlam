/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Validação de Segurança para Debug
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  const errorMsg = "CRÍTICO: A API Key do Firebase não foi encontrada! Verifique se o arquivo .env existe e se as variáveis começam com VITE_.";
  console.error(errorMsg);
  // O alert ajuda a identificar o erro imediatamente na tela branca
  alert(errorMsg);
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };