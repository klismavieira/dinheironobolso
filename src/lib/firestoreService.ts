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
  // Add robust check for data and date field
  if (!data || !data.date || typeof data.date.toDate !== 'function') {
    console.error('Invalid transaction data found, missing or invalid date:', docSnapshot.id, data);
    throw new Error(`O documento de transação com ID ${docSnapshot.id} é inválido ou não possui uma data.`);
  }
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
      try {
        const transactions = querySnapshot.docs.map(fromFirestore);
        onUpdate(transactions);
      } catch (e) {
        console.error("Error processing transaction data:", e);
        if (e instanceof Error) {
            onError(new Error(`Erro ao processar dados da transação: ${e.message}`));
        } else {
            onError(new Error("Ocorreu um erro desconhecido ao processar as transações."));
        }
      }
    },
    (error) => {
      console.error('Error listening to transaction updates:', error);
      onError(new Error(`Não foi possível buscar as transações: ${error.message}`));
    }
  );

  return unsubscribe;
};

export const getTransactionsForPeriod = async (startDate: Date, endDate: Date): Promise<Transaction[]> => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(fromFirestore);
  } catch (error) {
    console.error("Firebase Error: Failed to get transactions for period.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível buscar as transações do período: ${error.message}`);
    }
    throw new Error("Não foi possível buscar as transações. Verifique sua conexão ou permissões.");
  }
};

export const getTotalTransactionCount = async (): Promise<number> => {
  const q = query(collection(db, TRANSACTIONS_COLLECTION));
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
  try {
    await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);
  } catch (error) {
    console.error("Firebase Error: Failed to add transaction.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar a transação: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar a transação. Verifique sua conexão ou permissões.");
  }
};

export const addTransactionsBatch = async (transactions: Omit<Transaction, 'id'>[]): Promise<void> => {
  const batch = writeBatch(db);
  transactions.forEach(transactionData => {
    const docRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    batch.set(docRef, transactionData);
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

export const updateTransaction = async (id: string, transactionData: Partial<Omit<Transaction, 'id'>>): Promise<void> => {
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
  try {
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
  newData: Partial<Omit<Transaction, 'id' | 'date' | 'seriesId' | 'installment' | 'type'>>
): Promise<void> => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('seriesId', '==', seriesId)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    const fromTime = fromDate.getTime();

    querySnapshot.forEach(doc => {
      const transaction = fromFirestore(doc);
      const transactionTime = transaction.date.getTime();

      if (transactionTime >= fromTime) {
        batch.update(doc.ref, newData);
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
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('seriesId', '==', seriesId)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    const fromTime = fromDate.getTime();

    querySnapshot.forEach(doc => {
      const transaction = fromFirestore(doc);
      const transactionTime = transaction.date.getTime();

      if (transactionTime >= fromTime) {
        batch.delete(doc.ref);
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
          await setDoc(docRef, { income: [], expense: [] });
          onUpdate(defaultCategories);
        } catch(e) {
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
};

export const addCategory = async (type: 'income' | 'expense', newCategory: string): Promise<void> => {
  const docRef = doc(db, CATEGORIES_COLLECTION, 'user_defined');
  const fieldToUpdate = type === 'income' ? 'income' : 'expense';
  
  try {
    await updateDoc(docRef, {
      [fieldToUpdate]: arrayUnion(newCategory),
    });
  } catch (error) {
    console.error("Firebase Error: Failed to add category.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar a categoria: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar a nova categoria. Verifique sua conexão ou permissões.");
  }
};
