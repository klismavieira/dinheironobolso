
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signInWithEmail, signUpWithEmail, signOutUser, sendPasswordReset } from '@/lib/auth';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: typeof signInWithEmail;
  signUpWithEmail: typeof signUpWithEmail;
  signOutUser: typeof signOutUser;
  sendPasswordReset: typeof sendPasswordReset;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This now runs only on the client, which is the correct place for it.
    const unsubscribePromise = setPersistence(auth, browserLocalPersistence).then(() => {
      // onAuthStateChanged() sets up the real-time listener for auth changes.
      return onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
    }).catch(error => {
      console.error("Firebase Auth persistence error:", error.code, error.message);
      setLoading(false);
      // Return a no-op function if persistence fails, so we don't break the app
      return () => {};
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe());
    };
  }, []);

  const value = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
