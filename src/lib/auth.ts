
'use client';

import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = () => {
  // Use signInWithRedirect for environments where popups are blocked (like iframes)
  return signInWithRedirect(auth, googleProvider);
};

export const signOutUser = () => {
  return signOut(auth);
};

export { auth, getRedirectResult };
