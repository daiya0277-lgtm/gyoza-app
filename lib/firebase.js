// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 seedProducts.mjs と同じ firebaseConfig をコピペする
const firebaseConfig = {
  apiKey: "AIzaSyAiFzGYJK-DpdPBTqVs1wj6TUuT2jRNXZ4",
  authDomain: "gyozanorikumo11.firebaseapp.com",
  projectId: "gyozanorikumo11",
  storageBucket: "gyozanorikumo11.firebasestorage.app",
  messagingSenderId: "170414052110",
  appId: "1:170414052110:web:f4096d24890762dfc37d5f",
};

// Next.js だとホットリロードで二重初期化になりがちなので getApps() チェック
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
