// seedProducts.mjs
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
} from "firebase/firestore";

// 🔥 Firebaseコンソール → プロジェクト設定 → Webアプリ（</>）からコピペする
const firebaseConfig = {
  apiKey: "AIzaSyAiFzGYJK-DpdPBTqVs1wj6TUuT2jRNXZ4",
  authDomain: "gyozanorikumo11.firebaseapp.com",
  projectId: "gyozanorikumo11",
  storageBucket: "gyozanorikumo11.firebasestorage.app",
  messagingSenderId: "170414052110",
  appId: "1:170414052110:web:f4096d24890762dfc37d5f",
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 商品データ
const products = [
  {
    id: "yaki",
    name: "焼き餃子",
    price: 250,
    capacity: 3,
    stockTotal: 50,
    stockRemaining: 50,
    sortOrder: 1,
  },
  {
    id: "craft",
    name: "クラフト餃子",
    price: 300,
    capacity: 3,
    stockTotal: 50,
    stockRemaining: 50,
    sortOrder: 2,
  },
  {
    id: "cheese",
    name: "チーズ餃子",
    price: 350,
    capacity: 3,
    stockTotal: 50,
    stockRemaining: 50,
    sortOrder: 3,
  },
];

// Firestore への投入処理
async function seedProducts() {
  console.log("🔥 Seeding products...");

  for (const p of products) {
    await setDoc(doc(db, "products", p.id), p);
    console.log(`  👍 ${p.id} inserted`);
  }

  console.log("🎉 Done!");
}

// 実行
seedProducts().catch((err) => console.error(err));
