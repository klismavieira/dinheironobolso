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
  closingDay: number; // 1-31
  dueDay: number; // 1-31
};

export type CardExpense = {
  id: string;
  cardId: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  isBilled: boolean;
  billingCycle: string; // e.g., '2024-07'
};
