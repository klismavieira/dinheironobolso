
'use client';

import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { auth } from './firebase';

// Set persistence to local FIRST. This is the crucial fix for pop-up authentication
// in different browser contexts (e.g., "Open in New Window").
// This operation must complete before any other auth operation is initiated.
setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const signOutUser = () => {
  return signOut(auth);
};

export { auth };
