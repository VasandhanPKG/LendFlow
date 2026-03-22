import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Standard modular Firebase initialization
const firebaseConfig = {
  apiKey: "AIzaSyCvzpsAsV2nJTTJu98PlP2ZK6AXXpPifII",
  authDomain: "lendflow0718.firebaseapp.com",
  projectId: "lendflow0718",
  storageBucket: "lendflow0718.firebasestorage.app",
  messagingSenderId: "688064700314",
  appId: "1:688064700314:web:a015b66e3c88762e1a2423"
};

// Initialize Firebase with modular SDK
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;