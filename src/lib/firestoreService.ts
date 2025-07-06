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
  try {
    await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);
  } catch (error) {
    console.error("Firebase Error: Failed to add transaction.", error);
    throw new Error("Não foi possível adicionar a transação.");
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
    throw new Error("Não foi possível adicionar as transações recorrentes.");
  }
};

export const updateTransaction = async (id: string, transactionData: Partial<Omit<Transaction, 'id'>>): Promise<void> => {
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
  try {
    await updateDoc(transactionRef, transactionData);
  } catch (error) {
    console.error("Firebase Error: Failed to update transaction.", error);
    throw new Error("Não foi possível atualizar a transação.");
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
  
  try {
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to update future transactions.", error);
    throw new Error("Não foi possível atualizar as transações futuras.");
  }
};


export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
  } catch (error) {
    console.error("Firebase Error: Failed to delete transaction.", error);
    throw new Error("Não foi possível excluir a transação.");
  }
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
  
  try {
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to delete future transactions.", error);
    throw new Error("Não foi possível excluir as transações futuras.");
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
  
  try {
    await updateDoc(docRef, {
      [fieldToUpdate]: arrayUnion(newCategory),
    });
  } catch (error) {
    console.error("Firebase Error: Failed to add category.", error);
    throw new Error("Não foi possível adicionar a nova categoria.");
  }
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
  try {
    await addDoc(collection(db, CREDIT_CARDS_COLLECTION), cardData);
  } catch (error) {
    console.error("Firebase Error: Failed to add credit card.", error);
    throw new Error("Não foi possível adicionar o cartão. Verifique sua conexão ou as permissões do banco de dados.");
  }
};

export const updateCreditCard = async (id: string, cardData: Partial<Omit<CreditCard, 'id'>>): Promise<void> => {
  try {
    await updateDoc(doc(db, CREDIT_CARDS_COLLECTION, id), cardData);
  } catch(error) {
    console.error("Firebase Error: Failed to update credit card.", error);
    throw new Error("Não foi possível atualizar o cartão. Verifique sua conexão ou as permissões do banco de dados.");
  }
};

export const deleteCreditCard = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CREDIT_CARDS_COLLECTION, id));
  } catch (error) {
    console.error("Firebase Error: Failed to delete credit card.", error);
    throw new Error("Não foi possível excluir o cartão.");
  }
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
  try {
    await addDoc(expensesCollectionRef, expenseData);
  } catch (error) {
    console.error("Firebase Error: Failed to add card expense.", error);
    throw new Error("Não foi possível adicionar a despesa ao cartão.");
  }
};

export const addCardExpensesBatch = async (cardId:string, expensesData: Omit<CardExpense, 'id'>[]): Promise<void> => {
  const batch = writeBatch(db);
  const expensesCollectionRef = collection(db, CREDIT_CARDS_COLLECTION, cardId, CARD_EXPENSES_SUBCOLLECTION);
  expensesData.forEach(expense => {
    const docRef = doc(expensesCollectionRef);
    batch.set(docRef, expense);
  });
  try {
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to add card expenses batch.", error);
    throw new Error("Não foi possível adicionar a assinatura ao cartão.");
  }
}

export const deleteCardExpense = async (cardId: string, expenseId: string): Promise<void> => {
  const expenseDocRef = doc(db, CREDIT_CARDS_COLLECTION, cardId, CARD_EXPENSES_SUBCOLLECTION, expenseId);
  try {
    await deleteDoc(expenseDocRef);
  } catch (error) {
    console.error("Firebase Error: Failed to delete card expense.", error);
    throw new Error("Não foi possível excluir a despesa do cartão.");
  }
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
  
  try {
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to delete future card expenses.", error);
    throw new Error("Não foi possível excluir as despesas futuras.");
  }
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

  try {
    await addTransaction(billTransaction);

    const batch = writeBatch(db);
    expensesToBill.forEach(expense => {
      const expenseDocRef = doc(db, CREDIT_CARDS_COLLECTION, card.id, CARD_EXPENSES_SUBCOLLECTION, expense.id);
      batch.update(expenseDocRef, { isBilled: true });
    });

    await batch.commit();
  } catch (error) {
     console.error("Firebase Error: Failed to close credit card bill.", error);
     if (error instanceof Error) {
        throw new Error(`Não foi possível fechar a fatura: ${error.message}`);
     }
     throw new Error('Não foi possível fechar a fatura.');
  }
};
