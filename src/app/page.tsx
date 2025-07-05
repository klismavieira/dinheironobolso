'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import {
  onTransactionsUpdate,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/lib/firestoreService';
import { Header } from '@/components/layout/header';
import { FinancialSummary } from '@/components/financials/financial-summary';
import { TransactionList } from '@/components/financials/transaction-list';
import { TransactionDialog } from '@/components/financials/transaction-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction> | null>(null);

  useEffect(() => {
    const unsubscribe = onTransactionsUpdate(
      (updatedTransactions) => {
        setTransactions(updatedTransactions);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        toast({
          title: "Erro ao buscar transações",
          description: "Não foi possível carregar os dados. Tente novamente mais tarde.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast]);

  const handleAddTransaction = (type: 'income' | 'expense') => {
    setCurrentTransaction({ type });
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setDialogOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast({
        title: "Transação excluída!",
        description: "A transação foi removida com sucesso.",
        variant: 'destructive'
      });
    } catch (error) {
       toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover a transação.",
        variant: "destructive",
      });
    }
  };

  const handleSaveTransaction = async (transaction: Partial<Transaction>) => {
    try {
       if (transaction.id) {
        const { id, ...dataToUpdate } = transaction;
        await updateTransaction(id, dataToUpdate);
        toast({
            title: "Transação atualizada!",
            description: "Sua transação foi atualizada com sucesso.",
        });
      } else {
        const { id, ...dataToAdd } = transaction;
        await addTransaction(dataToAdd as Omit<Transaction, 'id'>);
        toast({
            title: "Transação adicionada!",
            description: "Sua nova transação foi adicionada com sucesso.",
        });
      }
    } catch (error) {
       toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a transação.",
        variant: "destructive",
      });
    }
  };

  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3 md:gap-8">
            <Skeleton className="h-[125px] w-full" />
            <Skeleton className="h-[125px] w-full" />
            <Skeleton className="h-[125px] w-full" />
          </div>
        ) : (
          <FinancialSummary transactions={transactions} />
        )}

        <div className="flex items-center justify-end gap-2">
            <Button onClick={() => handleAddTransaction('income')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Receita
            </Button>
            <Button onClick={() => handleAddTransaction('expense')} variant="destructive">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Despesa
            </Button>
        </div>

        {loading ? (
            <div className="grid gap-4 md:gap-8 md:grid-cols-2">
                <Skeleton className="h-[522px] w-full" />
                <Skeleton className="h-[522px] w-full" />
            </div>
        ) : (
            <div className="grid gap-4 md:gap-8 md:grid-cols-2">
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
        )}
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
