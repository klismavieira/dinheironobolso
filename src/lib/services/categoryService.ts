
'use client';

import {
  doc,
  setDoc,
  arrayUnion,
  arrayRemove,
  updateDoc,
  runTransaction,
  collection,
  where,
  getDocs,
  query,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';

const CATEGORIES_COLLECTION = 'categories';
const TRANSACTIONS_COLLECTION = 'transactions';

export type Categories = {
  income: string[];
  expense: string[];
}

// --- Helper to get current user ID ---
const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuário não autenticado. Não é possível realizar a operação.");
  }
  return user.uid;
}

export const onCategoriesUpdate = (
  onUpdate: (categories: Categories) => void,
  onError: (error: Error) => void
) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, CATEGORIES_COLLECTION, userId); // Use user ID as document ID

    const unsubscribe = onSnapshot(
      docRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const categories: Categories = {
            income: [...new Set([...INCOME_CATEGORIES, ...(data.income || [])])],
            expense: [...new Set([...EXPENSE_CATEGORIES, ...(data.expense || [])])]
          };
          onUpdate(categories);
        } else {
          // Document doesn't exist, so create it with default categories
          const defaultCategories = {
            income: INCOME_CATEGORIES,
            expense: EXPENSE_CATEGORIES,
          };
          try {
            // Store only the user-added (empty at first) categories
            await setDoc(docRef, { income: [], expense: [] });
            onUpdate(defaultCategories);
          } catch (e) {
            if (e instanceof Error) {
              onError(new Error(`Não foi possível inicializar as categorias: ${e.message}`));
            }
          }
        }
      },
      (error) => {
        console.error("Error listening to category updates:", error);
        onError(new Error(`Não foi possível buscar as categorias: ${error.message}`));
      }
    );

    return unsubscribe;
  } catch (error) {
    // This will catch the error from getCurrentUserId if the user is not logged in
    // when the listener is attached.
    console.warn("Could not attach category listener: user not authenticated.");
    return () => {}; // Return a no-op unsubscribe function
  }
};

export const addCategory = async (type: 'income' | 'expense', newCategory: string): Promise<void> => {
  const userId = getCurrentUserId();
  const docRef = doc(db, CATEGORIES_COLLECTION, userId);
  const fieldToUpdate = type === 'income' ? 'income' : 'expense';
  
  try {
    // Use setDoc with merge to create the document if it doesn't exist.
    await setDoc(docRef, {
      [fieldToUpdate]: arrayUnion(newCategory)
    }, { merge: true });
  } catch (error) {
    console.error("Firebase Error: Failed to add category.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar a categoria: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar a nova categoria. Verifique sua conexão ou permissões.");
  }
};


export const updateCategory = async (type: 'income' | 'expense', oldName: string, newName: string): Promise<void> => {
  const userId = getCurrentUserId();
  const categoryDocRef = doc(db, CATEGORIES_COLLECTION, userId);
  const fieldToUpdate = type === 'income' ? 'income' : 'expense';

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Update the category name in the categories document
      transaction.update(categoryDocRef, {
        [fieldToUpdate]: arrayRemove(oldName)
      });
      transaction.update(categoryDocRef, {
        [fieldToUpdate]: arrayUnion(newName)
      });

      // 2. Find all transactions with the old category name and update them
      const transQuery = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('userId', '==', userId),
        where('category', '==', oldName),
        where('type', '==', type)
      );
      
      const transSnapshot = await getDocs(transQuery);
      transSnapshot.forEach((doc) => {
        transaction.update(doc.ref, { category: newName });
      });
    });
  } catch (error) {
    console.error("Firebase Error: Failed to update category and transactions.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível atualizar a categoria: ${error.message}`);
    }
    throw new Error("Não foi possível atualizar a categoria. Verifique sua conexão ou permissões.");
  }
};

export const deleteCategory = async (type: 'income' | 'expense', categoryName: string): Promise<void> => {
  const userId = getCurrentUserId();
  const docRef = doc(db, CATEGORIES_COLLECTION, userId);
  const fieldToUpdate = type === 'income' ? 'income' : 'expense';

  try {
    // Note: This does NOT update existing transactions with the deleted category.
    // They will retain the old category name as a string.
    await updateDoc(docRef, {
      [fieldToUpdate]: arrayRemove(categoryName),
    });
  } catch (error) {
    console.error("Firebase Error: Failed to delete category.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível excluir a categoria: ${error.message}`);
    }
    throw new Error("Não foi possível excluir a categoria. Verifique sua conexão ou permissões.");
  }
};
