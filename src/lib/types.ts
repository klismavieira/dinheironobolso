export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  isPaid: boolean;
  seriesId?: string;
  installment?: string;
};
