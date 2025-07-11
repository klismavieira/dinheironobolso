
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithEmail, signInWithGoogle, signOutUser, getRedirectResult } from '@/lib/auth';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: typeof signInWithEmail;
  signInWithGoogle: typeof signInWithGoogle;
  signOutUser: typeof signOutUser;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for redirect result when the app loads
    getRedirectResult(auth)
      .then((result) => {
        // If we get a result, the user has just signed in.
        // onAuthStateChanged will handle setting the user.
        // We can just log that it was successful.
        if (result) {
          console.log("Redirect login successful");
        }
      })
      .catch((error) => {
        console.error("Error getting redirect result:", error);
      })
      .finally(() => {
        // The onAuthStateChanged listener will handle the user state.
        // This is our primary way of knowing if the user is logged in.
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });
        return () => unsubscribe();
      });
  }, []);

  const value = {
    user,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signOutUser,
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
