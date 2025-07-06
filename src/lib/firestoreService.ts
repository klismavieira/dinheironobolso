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
import type { Transaction, CreditCard, CardExpense } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './constants';
import { format } from 'date-fns';

const TRANSACTIONS_COLLECTION = 'transactions';
const CATEGORIES_COLLECTION = 'categories';
const CREDIT_CARDS_COLLECTION = 'credit_cards';
const CARD_EXPENSES_SUBCOLLECTION = 'expenses';


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

export const getTransactionsForPeriod = async (startDate: Date, endDate: Date): Promise<Transaction[]> => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(fromFirestore);
};

export const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'seriesId' | 'installment'>): Promise<void> => {
  await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);
};

export const addTransactionsBatch = async (transactions: Omit<Transaction, 'id'>[]): Promise<void> => {
  const batch = writeBatch(db);
  transactions.forEach(transactionData => {
    const docRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    batch.set(docRef, transactionData);
  });
  await batch.commit();
};

export const updateTransaction = async (id: string, transactionData: Partial<Omit<Transaction, 'id'>>): Promise<void> => {
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
  await updateDoc(transactionRef, transactionData);
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
};


export const deleteTransaction = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
};

export const deleteFutureTransactions = async (seriesId: string, fromDate: Date): Promise<void> => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('seriesId', '==', seriesId)
  );

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

// --- Credit Card Functions ---

export const onCreditCardsUpdate = (
  onUpdate: (cards: CreditCard[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(collection(db, CREDIT_CARDS_COLLECTION), orderBy('name'));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const cards = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditCard));
      onUpdate(cards);
    },
    (error) => {
      console.error('Error listening to credit card updates:', error);
      onError(error);
    }
  );

  return unsubscribe;
};

export const addCreditCard = async (cardData: Omit<CreditCard, 'id'>): Promise<void> => {
  await addDoc(collection(db, CREDIT_CARDS_COLLECTION), cardData);
};

export const updateCreditCard = async (id: string, cardData: Partial<Omit<CreditCard, 'id'>>): Promise<void> => {
  await updateDoc(doc(db, CREDIT_CARDS_COLLECTION, id), cardData);
};

export const deleteCreditCard = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, CREDIT_CARDS_COLLECTION, id));
};


// --- Card Expense Functions ---

const fromFirestoreCardExpense = (docSnapshot: any): CardExpense => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    date: (data.date as Timestamp).toDate(),
  } as CardExpense;
};

export const onCardExpensesUpdate = (
  cardId: string,
  billingCycle: string, // YYYY-MM
  onUpdate: (expenses: CardExpense[]) => void,
  onError: (error: Error) => void
) => {
  const expensesCollectionRef = collection(db, CREDIT_CARDS_COLLECTION, cardId, CARD_EXPENSES_SUBCOLLECTION);
  const q = query(
    expensesCollectionRef,
    where('billingCycle', '==', billingCycle),
    orderBy('date', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const expenses = querySnapshot.docs.map(fromFirestoreCardExpense);
      onUpdate(expenses);
    },
    (error) => {
      console.error('Error listening to card expense updates:', error);
      onError(error);
    }
  );

  return unsubscribe;
};

export const addCardExpense = async (cardId: string, expenseData: Omit<CardExpense, 'id'>): Promise<void> => {
  const expensesCollectionRef = collection(db, CREDIT_CARDS_COLLECTION, cardId, CARD_EXPENSES_SUBCOLLECTION);
  await addDoc(expensesCollectionRef, expenseData);
};

export const addCardExpensesBatch = async (cardId:string, expensesData: Omit<CardExpense, 'id'>[]): Promise<void> => {
  const batch = writeBatch(db);
  const expensesCollectionRef = collection(db, CREDIT_CARDS_COLLECTION, cardId, CARD_EXPENSES_SUBCOLLECTION);
  expensesData.forEach(expense => {
    const docRef = doc(expensesCollectionRef);
    batch.set(docRef, expense);
  });
  await batch.commit();
}

export const deleteCardExpense = async (cardId: string, expenseId: string): Promise<void> => {
  const expenseDocRef = doc(db, CREDIT_CARDS_COLLECTION, cardId, CARD_EXPENSES_SUBCOLLECTION, expenseId);
  await deleteDoc(expenseDocRef);
};

export const deleteFutureCardExpenses = async (cardId: string, seriesId: string, fromDate: Date): Promise<void> => {
  const expensesCollectionRef = collection(db, CREDIT_CARDS_COLLECTION, cardId, CARD_EXPENSES_SUBCOLLECTION);
  const q = query(
    expensesCollectionRef,
    where('seriesId', '==', seriesId)
  );

  const querySnapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  const fromTime = fromDate.getTime();

  querySnapshot.forEach(doc => {
    const expense = fromFirestoreCardExpense(doc);
    const expenseTime = expense.date.getTime();

    if (expenseTime >= fromTime) {
      batch.delete(doc.ref);
    }
  });
  
  await batch.commit();
};

export const closeCreditCardBill = async (
  card: CreditCard,
  billingCycle: string // YYYY-MM
): Promise<void> => {
  const expensesCollectionRef = collection(db, CREDIT_CARDS_COLLECTION, card.id, CARD_EXPENSES_SUBCOLLECTION);
  const q = query(
    expensesCollectionRef,
    where('billingCycle', '==', billingCycle),
    where('isBilled', '==', false)
  );

  const querySnapshot = await getDocs(q);
  const expensesToBill = querySnapshot.docs.map(fromFirestoreCardExpense);

  if (expensesToBill.length === 0) {
    throw new Error('Não há despesas para faturar neste ciclo.');
  }

  const totalAmount = expensesToBill.reduce((sum, expense) => sum + expense.amount, 0);

  const [year, month] = billingCycle.split('-').map(Number);
  const dueDate = new Date(year, month - 1, card.dueDay);
  
  if (card.dueDay < card.closingDay) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  const billTransaction: Omit<Transaction, 'id' | 'seriesId' | 'installment'> = {
    type: 'expense',
    amount: totalAmount,
    category: 'Fatura do Cartão',
    description: `Fatura ${card.name} - Venc. ${format(dueDate, 'dd/MM/yyyy')}`,
    date: dueDate,
    isPaid: false,
  };

  await addTransaction(billTransaction);

  const batch = writeBatch(db);
  expensesToBill.forEach(expense => {
    const expenseDocRef = doc(db, CREDIT_CARDS_COLLECTION, card.id, CARD_EXPENSES_SUBCOLLECTION, expense.id);
    batch.update(expenseDocRef, { isBilled: true });
  });

  await batch.commit();
};
