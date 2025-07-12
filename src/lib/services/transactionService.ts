
'use client';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  Timestamp,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';


const TRANSACTIONS_COLLECTION = 'transactions';


// Helper to convert Firestore data to Transaction type. Returns null if data is invalid.
const transactionFromFirestore = (docSnapshot: any): Transaction | null => {
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

// Fetches ALL transactions for the user and then filters by date on the client.
// This avoids the need for a composite index in Firestore.
export const getTransactionsForPeriod = async (startDate: Date, endDate: Date): Promise<Transaction[]> => {
  try {
    const allTransactions = await getAllTransactions();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    const filtered = allTransactions.filter(t => {
      const transactionTime = t.date.getTime();
      return transactionTime >= startTime && transactionTime <= endTime;
    });

    return filtered;

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
      .map(transactionFromFirestore)
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

export const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'seriesId' | 'installment' | 'userId'>): Promise<void> => {
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

export const addTransactionsBatch = async (transactions: Omit<Transaction, 'id' | 'userId'>[]): Promise<void> => {
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
      const transaction = transactionFromFirestore(doc);
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
      const transaction = transactionFromFirestore(doc);
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
    try {
    const allTransactions = await getAllTransactions();
    const endTime = endDate.getTime();
    
    const filtered = allTransactions.filter(t => {
      const transactionTime = t.date.getTime();
      return transactionTime < endTime;
    });

    return filtered;

  } catch (error) {
    console.error("Firebase Error: Failed to get transactions before date.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível buscar as transações anteriores: ${error.message}`);
    }
    throw new Error("Não foi possível buscar as transações anteriores. Verifique sua conexão ou permissões.");
  }
};
