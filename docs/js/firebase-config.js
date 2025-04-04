const firebaseConfig = {
  apiKey: "AIzaSyBBQRXixjik1blRLziCgtyNeHZVBzDRTYg",
  authDomain: "threedprintsite.firebaseapp.com",
  projectId: "threedprintsite",
  storageBucket: "threedprintsite.firebasestorage.app",
  messagingSenderId: "854432928592",
  appId: "1:854432928592:web:407cbe6e80793f1edbd255",
  measurementId: "G-83B93XYV9P"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db }; // Export the auth and db variables