
'use client';

import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = () => {
  // Use signInWithPopup for a better user experience in most browsers.
  return signInWithPopup(auth, googleProvider);
};

export const signOutUser = () => {
  return signOut(auth);
};

// This export is no longer needed with signInWithPopup
export { auth };
