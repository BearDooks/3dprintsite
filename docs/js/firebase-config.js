import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBBQRXixjik1blRLziCgtyNeHZVBzDRTYg",
    authDomain: "threedprintsite.firebaseapp.com",
    projectId: "threedprintsite",
    storageBucket: "threedprintsite.firebasestorage.app",
    messagingSenderId: "854432928592",
    appId: "1:854432928592:web:407cbe6e80793f1edbd255",
    measurementId: "G-83B93XYV9P"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();