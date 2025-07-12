
'use client';

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth } from './firebase';


export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
};

export const signOutUser = () => {
  return signOut(auth);
};
