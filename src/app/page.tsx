'use client';

import { useState } from 'react';
import type { Transaction } from '@/lib/types';
import { Header } from '@/components/layout/header';
import { FinancialSummary } from '@/components/financials/financial-summary';
import { TransactionList } from '@/components/financials/transaction-list';
import { TransactionDialog } from '@/components/financials/transaction-dialog';
import { AiSuggestions } from '@/components/financials/ai-suggestions';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const initialTransactions: Transaction[] = [
  { id: '1', type: 'income', amount: 5000, category: 'Salário', description: 'Salário Mensal', date: new Date('2024-07-05T00:00:00') },
  { id: '2', type: 'expense', amount: 1200, category: 'Moradia', description: 'Aluguel', date: new Date('2024-07-05T00:00:00') },
  { id: '3', type: 'expense', amount: 650, category: 'Alimentação', description: 'Supermercado', date: new Date('2024-07-08T00:00:00') },
  { id: '4', type: 'expense', amount: 200, category: 'Transporte', description: 'Combustível', date: new Date('2024-07-10T00:00:00') },
  { id: '5', type: 'income', amount: 1500, category: 'Freelance', description: 'Projeto de Design', date: new Date('2024-07-15T00:00:00') },
  { id: '6', type: 'expense', amount: 300, category: 'Lazer', description: 'Cinema e Jantar', date: new Date('2024-07-18T00:00:00') },
];

export default function Home() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction> | null>(null);

  const handleAddTransaction = (type: 'income' | 'expense') => {
    setCurrentTransaction({ type });
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setDialogOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
    toast({
        title: "Transação excluída!",
        description: "A transação foi removida com sucesso.",
        variant: 'destructive'
    });
  };

  const handleSaveTransaction = (transaction: Transaction) => {
    const index = transactions.findIndex((t) => t.id === transaction.id);
    if (index !== -1) {
      const updatedTransactions = [...transactions];
      updatedTransactions[index] = transaction;
      setTransactions(updatedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
      toast({
          title: "Transação atualizada!",
          description: "Sua transação foi atualizada com sucesso.",
      });
    } else {
      setTransactions([...transactions, transaction].sort((a, b) => b.date.getTime() - a.date.getTime()));
      toast({
          title: "Transação adicionada!",
          description: "Sua nova transação foi adicionada com sucesso.",
      });
    }
  };

  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">
        <FinancialSummary transactions={transactions} />

        <div className="flex items-center justify-end gap-2">
            <Button onClick={() => handleAddTransaction('income')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Receita
            </Button>
            <Button onClick={() => handleAddTransaction('expense')} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Despesa
            </Button>
        </div>

        <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-4 md:gap-8 md:grid-cols-2">
            <TransactionList
              title="Receitas"
              transactions={incomeTransactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
            />
            <TransactionList
              title="Despesas"
              transactions={expenseTransactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
            />
          </div>
          <div className="lg:col-span-1">
            <AiSuggestions transactions={transactions} />
          </div>
        </div>
      </main>
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={currentTransaction}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}
