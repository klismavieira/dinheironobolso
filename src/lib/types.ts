export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  isPaid: boolean;
  seriesId?: string;
  installment?: string;
};

export type CreditCard = {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
};

export type CardExpense = {
  id: string;
  cardId: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  seriesId?: string;
  installment?: string;
};
