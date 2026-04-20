import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAGbvVLYbkVPp50k6dbO8X7qpwwSLUED9k",
  authDomain: "omcc-5f0b2.firebaseapp.com",
  databaseURL:
    "https://omcc-5f0b2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "omcc-5f0b2",
  storageBucket: "omcc-5f0b2.firebasestorage.app",
  messagingSenderId: "161212442792",
  appId: "1:161212442792:web:2c68b74ce873b92350ba9d",
  measurementId: "G-9JHLGB9C7Y",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "main");
const realtimeDb = getDatabase(app);

export { auth, db, realtimeDb };
