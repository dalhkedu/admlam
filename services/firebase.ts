import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCYMaKP81uYn7xM4uBCL2d8v7vh6oUtHDU",
  authDomain: "lar-matilde-admin.firebaseapp.com",
  projectId: "lar-matilde-admin",
  storageBucket: "lar-matilde-admin.firebasestorage.app",
  messagingSenderId: "166780880362",
  appId: "1:166780880362:web:3ca2df5830bdee278c5e93",
  measurementId: "G-X92NEKB3GM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };