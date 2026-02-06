// 📡 LISTO MASTER - FIREBASE CONNECTION
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBuSsNqH9uWOYnROjvWFxTHvke3fXCGB6I",
    authDomain: "listo-pos-prod.firebaseapp.com",
    projectId: "listo-pos-prod",
    storageBucket: "listo-pos-prod.firebasestorage.app",
    messagingSenderId: "579228744504",
    appId: "1:579228744504:web:eba981935893b38f6e1fcd"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
