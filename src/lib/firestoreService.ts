import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction } from './types';

const TRANSACTIONS_COLLECTION = 'transactions';

// Helper to convert Firestore data to Transaction type
const fromFirestore = (docSnapshot: any): Transaction => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    date: (data.date as Timestamp).toDate(),
  } as Transaction;
};


export const getTransactions = async (): Promise<Transaction[]> => {
  const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(fromFirestore);
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
