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
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction, CreditCard, CardExpense } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './constants';
import { format } from 'date-fns';

const TRANSACTIONS_COLLECTION = 'transactions';
const CATEGORIES_COLLECTION = 'categories';
const CARDS_COLLECTION = 'creditCards';
const CARD_EXPENSES_COLLECTION = 'cardExpenses';


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
      onError(new Error(`Não foi possível buscar as transações: ${error.message}`));
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

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(fromFirestore);
  } catch (error) {
    console.error('Firebase Error: Failed to get transactions for period.', error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível buscar as transações do período: ${error.message}`);
    }
    throw new Error("Não foi possível buscar as transações. Verifique sua conexão ou permissões.");
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

// --- Credit Card Functions ---

const fromCardFirestore = (docSnapshot: any): CreditCard => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
  } as CreditCard;
};

const fromCardExpenseFirestore = (docSnapshot: any): CardExpense => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    date: (data.date as Timestamp).toDate(),
  } as CardExpense;
};

export const onCardsUpdate = (
  onUpdate: (cards: CreditCard[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(collection(db, CARDS_COLLECTION), orderBy('name'));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const cards = querySnapshot.docs.map(fromCardFirestore);
      onUpdate(cards);
    },
    (error) => {
      console.error('Error listening to card updates:', error);
      onError(new Error(`Não foi possível buscar os cartões: ${error.message}`));
    }
  );

  return unsubscribe;
};

export const onCardExpensesUpdate = (
    cardId: string,
    onUpdate: (expenses: CardExpense[]) => void,
    onError: (error: Error) => void
) => {
    if (!cardId) {
        onUpdate([]);
        return () => {};
    }

    const q = query(
        collection(db, CARD_EXPENSES_COLLECTION),
        where('cardId', '==', cardId),
        orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
            const expenses = querySnapshot.docs.map(fromCardExpenseFirestore);
            onUpdate(expenses);
        },
        (error) => {
            console.error(`Error listening to expenses for card ${cardId}:`, error);
            onError(new Error(`Não foi possível buscar as despesas do cartão: ${error.message}`));
        }
    );

    return unsubscribe;
};

export const addCard = async (cardData: Omit<CreditCard, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, CARDS_COLLECTION), cardData);
  } catch (error) {
    console.error("Firebase Error: Failed to add card.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar o cartão: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar o cartão. Verifique sua conexão ou permissões.");
  }
};

export const updateCard = async (id: string, cardData: Partial<Omit<CreditCard, 'id'>>): Promise<void> => {
  const cardRef = doc(db, CARDS_COLLECTION, id);
  try {
    await updateDoc(cardRef, cardData);
  } catch (error) {
    console.error("Firebase Error: Failed to update card.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível atualizar o cartão: ${error.message}`);
    }
    throw new Error("Não foi possível atualizar o cartão. Verifique sua conexão ou permissões.");
  }
};

export const deleteCard = async (id: string): Promise<void> => {
    const batch = writeBatch(db);
    const cardRef = doc(db, CARDS_COLLECTION, id);
    batch.delete(cardRef);

    const expensesQuery = query(collection(db, CARD_EXPENSES_COLLECTION), where('cardId', '==', id));
    
    try {
        const expensesSnapshot = await getDocs(expensesQuery);
        expensesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch(error) {
        console.error("Firebase Error: Failed to delete card and its expenses.", error);
        if (error instanceof Error) {
          throw new Error(`Não foi possível excluir o cartão: ${error.message}`);
        }
        throw new Error("Não foi possível excluir o cartão e suas despesas. Verifique sua conexão ou permissões.");
    }
};

export const addCardExpense = async (expenseData: Omit<CardExpense, 'id' | 'seriesId' | 'installment'>): Promise<void> => {
  try {
    await addDoc(collection(db, CARD_EXPENSES_COLLECTION), expenseData);
  } catch (error) {
    console.error("Firebase Error: Failed to add card expense.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar a despesa ao cartão: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar a despesa. Verifique sua conexão ou permissões.");
  }
};

export const addCardExpensesBatch = async (expenses: Omit<CardExpense, 'id'>[]): Promise<void> => {
  const batch = writeBatch(db);
  expenses.forEach(expenseData => {
    const docRef = doc(collection(db, CARD_EXPENSES_COLLECTION));
    batch.set(docRef, expenseData);
  });
  try {
    await batch.commit();
  } catch (error) {
    console.error("Firebase Error: Failed to add card expenses batch.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível adicionar as despesas recorrentes: ${error.message}`);
    }
    throw new Error("Não foi possível adicionar as despesas recorrentes. Verifique sua conexão ou permissões.");
  }
};

export const deleteCardExpense = async (id: string): Promise<void> => {
  const expenseRef = doc(db, CARD_EXPENSES_COLLECTION, id);
  try {
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error("Firebase Error: Failed to delete card expense.", error);
    if (error instanceof Error) {
      throw new Error(`Não foi possível excluir a despesa do cartão: ${error.message}`);
    }
    throw new Error("Não foi possível excluir a despesa. Verifique sua conexão ou permissões.");
  }
};

export const deleteFutureCardExpenses = async (seriesId: string, fromDate: Date): Promise<void> => {
    const q = query(
        collection(db, CARD_EXPENSES_COLLECTION),
        where('seriesId', '==', seriesId)
    );

    try {
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      const fromTime = fromDate.getTime();

      querySnapshot.forEach(doc => {
          const expense = fromCardExpenseFirestore(doc);
          const expenseTime = expense.date.getTime();
          if (expenseTime >= fromTime) {
              batch.delete(doc.ref);
          }
      });

      await batch.commit();
    } catch (error) {
        console.error("Firebase Error: Failed to delete future card expenses.", error);
        if (error instanceof Error) {
            throw new Error(`Não foi possível excluir as despesas futuras: ${error.message}`);
        }
        throw new Error("Não foi possível excluir as despesas futuras. Verifique sua conexão ou permissões.");
    }
};

export const closeCardInvoice = async (cardId: string, expenses: CardExpense[]): Promise<void> => {
    if (expenses.length === 0) {
        throw new Error("Não há despesas para fechar a fatura.");
    }

    const cardRef = doc(db, CARDS_COLLECTION, cardId);
    
    try {
        const cardSnap = await getDoc(cardRef);
        if (!cardSnap.exists()) {
            throw new Error("Cartão de crédito não encontrado.");
        }
        const card = fromCardFirestore(cardSnap);
        
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        const invoiceDate = new Date();
        const invoiceDescription = `Fatura ${card.name} - ${format(invoiceDate, 'MMM/yyyy')}`;
        
        const paymentDate = new Date();
        paymentDate.setDate(card.dueDay);
        if (paymentDate < new Date()) {
          paymentDate.setMonth(paymentDate.getMonth() + 1);
        }

        const invoiceTransaction: Omit<Transaction, 'id' | 'seriesId' | 'installment'> = {
            type: 'expense',
            amount: totalAmount,
            description: invoiceDescription,
            category: 'Fatura do Cartão',
            date: paymentDate,
            isPaid: false,
        };

        const batch = writeBatch(db);

        const newTransactionRef = doc(collection(db, TRANSACTIONS_COLLECTION));
        batch.set(newTransactionRef, invoiceTransaction);

        expenses.forEach(exp => {
            const expenseRef = doc(db, CARD_EXPENSES_COLLECTION, exp.id);
            batch.delete(expenseRef);
        });

        await batch.commit();

    } catch (error) {
        console.error("Firebase Error: Failed to close card invoice.", error);
        if (error instanceof Error) {
          throw new Error(`Não foi possível fechar a fatura: ${error.message}`);
        }
        throw new Error("Não foi possível fechar a fatura. Verifique sua conexão ou permissões.");
    }
};
