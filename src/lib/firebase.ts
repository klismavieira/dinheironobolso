// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1cTgNZdxwAbWLu_j2lWjASo-xW0KhISY",
  authDomain: "bd-dinheironobolso.firebaseapp.com",
  projectId: "bd-dinheironobolso",
  storageBucket: "bd-dinheironobolso.firebasestorage.app",
  messagingSenderId: "67858513446",
  appId: "1:67858513446:web:2b1325ccc829297e4430e7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
