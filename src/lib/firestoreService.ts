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
  setDoc,
  arrayUnion,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { Transaction } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './constants';

const TRANSACTIONS_COLLECTION = 'transactions';
const CATEGORIES_COLLECTION = 'categories';


// Helper to convert Firestore data to Transaction type. Returns null if data is invalid.
const fromFirestore = (docSnapshot: any): Transaction | null => {
  const data = docSnapshot.data();
  // Add robust check for data and date field. Malformed data can break the app.
  if (!data || !data.date || typeof data.date.toDate !== 'function') {
    console.warn(
      `Skipping invalid transaction document (ID: ${docSnapshot.id}). It's missing a valid 'date' field.`,
      data
    );
    return null;
  }
  return {
    id: docSnapshot.id,
    ...data,
    date: (data.date as Timestamp).toDate(),
  } as Transaction;
};

// --- Helper to get current user ID ---
const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuário não autenticado. Não é possível realizar a operação.");
  }
  return user.uid;
}

export const getTransactionsForPeriod = async (startDate: Date, endDate: Date): Promise<Transaction[]> => {
  const userId = getCurrentUserId();
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', startTimestamp),
    where('date', '<=', endTimestamp)
  );

  try {
    const querySnapshot = await getDocs(q);
    const transactions = querySnapshot.docs
      .map(fromFirestore)
      .filter((t): t is Transaction => t !== null); // Filter out any invalid documents

    // Sort on client to avoid needing a composite index
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    return transactions;
  } catch (error) {
    console.error("Firebase Error: Failed to get transactions for period.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível buscar as transações do período: ${error.message}`);
    }
    throw new Error("Não foi possível buscar as transações. Verifique sua conexão ou permissões.");
  }
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  const userId = getCurrentUserId();
  const q = query(collection(db, TRANSACTIONS_COLLECTION), where('userId', '==', userId));

  try {
    const querySnapshot = await getDocs(q);
    const transactions = querySnapshot.docs
      .map(fromFirestore)
      .filter((t): t is Transaction => t !== null); // Filter out any invalid documents
      
    // Sort on client to avoid needing a composite index
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    return transactions;
  } catch (error) {
    console.error("Firebase Error: Failed to get all transactions.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível buscar todas as transações: ${error.message}`);
    }
    throw new Error("Não foi possível buscar as transações. Verifique sua conexão ou permissões.");
  }
};

export const getTotalTransactionCount = async (): Promise<number> => {
  const userId = getCurrentUserId();
  const q = query(collection(db, TRANSACTIONS_COLLECTION), where('userId', '==', userId));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error("Firebase Error: Failed to get total transaction count.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível contar as transações: ${error.message}`);
    }
    throw new Error("Não foi possível contar as transações. Verifique sua conexão ou permissões.");
  }
};

export const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'seriesId' | 'installment'>): Promise<void> => {
  const userId = getCurrentUserId();
  try {
    await addDoc(collection(db, TRANSACTIONS_COLLECTION), { ...transactionData, userId });
  } catch (error) {
    console.error("Firebase Error: Failed to add transaction.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar a transação: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar a transação. Verifique sua conexão ou permissões.");
  }
};

export const addTransactionsBatch = async (transactions: Omit<Transaction, 'id'>[]): Promise<void> => {
  const userId = getCurrentUserId();
  const batch = writeBatch(db);
  transactions.forEach(transactionData => {
    const docRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    batch.set(docRef, { ...transactionData, userId });
  });
  try {
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to add transactions batch.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar as transações: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar as transações recorrentes. Verifique sua conexão ou permissões.");
  }
};

export const updateTransaction = async (id: string, transactionData: Partial<Omit<Transaction, 'id' | 'userId'>>): Promise<void> => {
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
  try {
    // We don't update the userId, just other fields. The document's ownership is immutable.
    await updateDoc(transactionRef, transactionData);
  } catch (error)
  {
    console.error("Firebase Error: Failed to update transaction.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível atualizar a transação: ${error.message}`);
    }
    throw new Error("Não foi possível atualizar a transação. Verifique sua conexão ou permissões.");
  }
};

export const updateFutureTransactions = async (
  seriesId: string,
  fromDate: Date,
  newData: Partial<Omit<Transaction, 'id' | 'date' | 'seriesId' | 'installment' | 'type' | 'userId'>>
): Promise<void> => {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('userId', '==', userId),
    where('seriesId', '==', seriesId)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    const fromTime = fromDate.getTime();

    querySnapshot.forEach(doc => {
      const transaction = fromFirestore(doc);
      if (transaction) {
        const transactionTime = transaction.date.getTime();

        if (transactionTime >= fromTime) {
          batch.update(doc.ref, newData);
        }
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to update future transactions.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível atualizar as transações: ${error.message}`);
    }
    throw new Error("Não foi possível atualizar as transações futuras. Verifique sua conexão ou permissões.");
  }
};


export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    // We assume the user can only get the ID of their own transactions, so a check isn't strictly needed here.
    // A robust implementation would use Firestore rules to enforce this.
    await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
  } catch (error) {
    console.error("Firebase Error: Failed to delete transaction.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível excluir a transação: ${error.message}`);
    }
    throw new Error("Não foi possível excluir a transação. Verifique sua conexão ou permissões.");
  }
};

export const deleteFutureTransactions = async (seriesId: string, fromDate: Date): Promise<void> => {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('userId', '==', userId),
    where('seriesId', '==', seriesId)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    const fromTime = fromDate.getTime();

    querySnapshot.forEach(doc => {
      const transaction = fromFirestore(doc);
      if (transaction) {
        const transactionTime = transaction.date.getTime();

        if (transactionTime >= fromTime) {
          batch.delete(doc.ref);
        }
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to delete future transactions.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível excluir as transações: ${error.message}`);
    }
    throw new Error("Não foi possível excluir as transações futuras. Verifique sua conexão ou permissões.");
  }
};

export const getTransactionsBeforeDate = async (endDate: Date): Promise<Transaction[]> => {
  const userId = getCurrentUserId();
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('userId', '==', userId),
    where('date', '<', endTimestamp)
  );

  try {
    const querySnapshot = await getDocs(q);
    const transactions = querySnapshot.docs
      .map(fromFirestore)
      .filter((t): t is Transaction => t !== null);
    return transactions;
  } catch (error) {
    console.error("Firebase Error: Failed to get transactions before date.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível buscar as transações anteriores: ${error.message}`);
    }
    throw new Error("Não foi possível buscar as transações anteriores. Verifique sua conexão ou permissões.");
  }
};

export type Categories = {
  income: string[];
  expense: string[];
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
    await updateDoc(docRef, {
      [fieldToUpdate]: arrayUnion(newCategory),
    });
  } catch (error) {
    if (error instanceof Error && (error as any).code === 'not-found') {
      // If the document doesn't exist, create it.
      await setDoc(docRef, {
        [fieldToUpdate]: [newCategory]
      });
    } else {
      console.error("Firebase Error: Failed to add category.", error);
      if (error instanceof Error) {
        throw new Error(`Não foi possível adicionar a categoria: ${error.message}`);
      }
      throw new Error("Não foi possível adicionar a nova categoria. Verifique sua conexão ou permissões.");
    }
  }
};
