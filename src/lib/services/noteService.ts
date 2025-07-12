
'use client';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  Timestamp,
  onSnapshot,
  where,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Note } from '@/lib/types';

const NOTES_COLLECTION = 'notes';

// Helper to get current user ID ---
const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuário não autenticado. Não é possível realizar a operação.");
  }
  return user.uid;
}

const noteFromFirestore = (docSnapshot: any): Note | null => {
    const data = docSnapshot.data();
    if (!data || !data.createdAt || typeof data.createdAt.toDate !== 'function') {
      console.warn(
        `Skipping invalid note document (ID: ${docSnapshot.id}). It's missing a valid 'createdAt' field.`,
        data
      );
      return null;
    }
    return {
      id: docSnapshot.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as Note;
  };


// Notes Service
export const onNotesUpdate = (
    onUpdate: (notes: Note[]) => void,
    onError: (error: Error) => void
  ) => {
    try {
      const userId = getCurrentUserId();
      const q = query(
        collection(db, NOTES_COLLECTION),
        where('userId', '==', userId)
      );
  
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const notes = querySnapshot.docs
            .map(noteFromFirestore)
            .filter((n): n is Note => n !== null);
          
          // Sort client-side to avoid composite index
          notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          onUpdate(notes);
        },
        (error) => {
          console.error("Error listening to note updates:", error);
          onError(new Error(`Não foi possível buscar as notas: ${error.message}`));
        }
      );
  
      return unsubscribe;
    } catch (error) {
      console.warn("Could not attach notes listener: user not authenticated.");
      return () => {};
    }
};

export const addNote = async (noteData: Omit<Note, 'id' | 'userId' | 'createdAt'>): Promise<void> => {
    const userId = getCurrentUserId();
    try {
      await addDoc(collection(db, NOTES_COLLECTION), {
        ...noteData,
        userId,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Firebase Error: Failed to add note.", error);
      if (error instanceof Error) {
        throw new Error(`Não foi possível adicionar a nota: ${error.message}`);
      }
      throw new Error("Não foi possível adicionar a nota.");
    }
};
  
export const updateNote = async (id: string, noteData: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
    const noteRef = doc(db, NOTES_COLLECTION, id);
    try {
      await updateDoc(noteRef, noteData);
    } catch (error) {
      console.error("Firebase Error: Failed to update note.", error);
      if (error instanceof Error) {
        throw new Error(`Não foi possível atualizar a nota: ${error.message}`);
      }
      throw new Error("Não foi possível atualizar a nota.");
    }
};

export const deleteNote = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, NOTES_COLLECTION, id));
    } catch (error) {
      console.error("Firebase Error: Failed to delete note.", error);
      if (error instanceof Error) {
        throw new Error(`Não foi possível excluir a nota: ${error.message}`);
      }
      throw new Error("Não foi possível excluir a nota.");
    }
};
