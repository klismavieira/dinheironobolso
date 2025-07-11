
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, setDoc, doc } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "__VAR_NEXT_PUBLIC_FIREBASE_API_KEY__",
  authDomain: "__VAR_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__",
  projectId: "__VAR_NEXT_PUBLIC_FIREBASE_PROJECT_ID__",
  storageBucket: "__VAR_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__VAR_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__VAR_NEXT_PUBLIC_FIREBASE_APP_ID__"
};

// Initialize Firebase
// Avoid re-initializing the app on hot reloads
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      console.warn("Firestore persistence failed: multiple tabs open. App will still work online.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn("Firestore persistence not available in this browser. App will still work online.");
    }
  });

export { db, auth };
