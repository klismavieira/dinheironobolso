
'use client';

import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogleRedirect = () => {
  // This function initiates the redirect.
  // The result is handled on the login page after the user is redirected back.
  return signInWithRedirect(auth, googleProvider);
};

export const signOutUser = () => {
  return signOut(auth);
};

export { auth };
