import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  setDoc,
  arrayUnion,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './constants';

const TRANSACTIONS_COLLECTION = 'transactions';
const CATEGORIES_COLLECTION = 'categories';

// Helper to convert Firestore data to Transaction type
const fromFirestore = (docSnapshot: any): Transaction => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    date: (data.date as Timestamp).toDate(),
  } as Transaction;
};

export const onTransactionsUpdate = (
  startDate: Date,
  endDate: Date,
  onUpdate: (transactions: Transaction[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const transactions = querySnapshot.docs.map(fromFirestore);
      onUpdate(transactions);
    },
    (error) => {
      console.error('Error listening to transaction updates:', error);
      onError(error);
    }
  );

  return unsubscribe;
};

export const addTransaction = async (transactionData: Omit<Transaction, 'id'>): Promise<void> => {
  await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);
};

export const updateTransaction = async (id: string, transactionData: Partial<Omit<Transaction, 'id'>>): Promise<void> => {
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
  await updateDoc(transactionRef, transactionData);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
};

export const deleteFutureTransactions = async (seriesId: string, fromDate: Date): Promise<void> => {
  const fromTimestamp = Timestamp.fromDate(fromDate);
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('seriesId', '==', seriesId),
    where('date', '>=', fromTimestamp)
  );

  const querySnapshot = await getDocs(q);
  const batch = writeBatch(db);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

export type Categories = {
  income: string[];
  expense: string[];
}

export const onCategoriesUpdate = (
  onUpdate: (categories: Categories) => void,
  onError: (error: Error) => void
) => {
  const docRef = doc(db, CATEGORIES_COLLECTION, 'user_defined');

  const unsubscribe = onSnapshot(
    docRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Use Set to remove duplicates
        const categories: Categories = {
          income: [...new Set([...INCOME_CATEGORIES, ...(data.income || [])])],
          expense: [...new Set([...EXPENSE_CATEGORIES, ...(data.expense || [])])]
        };
        onUpdate(categories);
      } else {
        const defaultCategories = {
          income: INCOME_CATEGORIES,
          expense: EXPENSE_CATEGORIES,
        };
        try {
          // Initialize with empty arrays for user-defined categories
          await setDoc(docRef, { income: [], expense: [] });
          onUpdate(defaultCategories);
        } catch(e) {
            if (e instanceof Error) {
                onError(e)
            }
        }
      }
    },
    (error) => {
      console.error("Error listening to category updates:", error);
      onError(error);
    }
  );

  return unsubscribe;
};

export const addCategory = async (type: 'income' | 'expense', newCategory: string): Promise<void> => {
  const docRef = doc(db, CATEGORIES_COLLECTION, 'user_defined');
  const fieldToUpdate = type === 'income' ? 'income' : 'expense';
  
  await updateDoc(docRef, {
    [fieldToUpdate]: arrayUnion(newCategory),
  });
};
