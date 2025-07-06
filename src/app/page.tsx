'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import {
  addTransaction,
  updateTransaction,
  updateFutureTransactions,
  deleteTransaction,
  deleteFutureTransactions,
  addTransactionsBatch,
  onCategoriesUpdate,
  type Categories,
  getAllTransactions,
} from '@/lib/firestoreService';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { FinancialSummary } from '@/components/financials/financial-summary';
import { TransactionList } from '@/components/financials/transaction-list';
import { TransactionDialog, type FormValues } from '@/components/financials/transaction-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction> & { editScope?: 'future' } | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToTogglePaid, setTransactionToTogglePaid] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Categories>({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
  const { toast } = useToast();

  const forceRefetch = () => setRefetchTrigger(c => c + 1);

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);
      try {
        const fetchedTransactions = await getAllTransactions();
        setTransactions(fetchedTransactions);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        const description = error instanceof Error ? error.message : "Não foi possível carregar as transações.";
        toast({
          title: "Erro ao carregar transações",
          description,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    doFetch();
  }, [refetchTrigger]);

  useEffect(() => {
    const unsubscribe = onCategoriesUpdate(
      (updatedCategories) => {
        setCategories(updatedCategories);
      },
      (error) => {
        console.error("Error fetching categories:", error);
        toast({
          title: "Erro ao buscar categorias",
          description: error.message,
          variant: "destructive",
        });
      }
    );

    return () => unsubscribe();
  }, []);


  const handleAddTransaction = (type: 'income' | 'expense') => {
    setCurrentTransaction({ type, date: new Date() });
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    if (transaction.seriesId) {
      setTransactionToEdit(transaction);
    } else {
      setCurrentTransaction(transaction);
      setDialogOpen(true);
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleTogglePaidStatus = (transaction: Transaction) => {
    setTransactionToTogglePaid(transaction);
  };

  const handleConfirmTogglePaid = async () => {
    if (!transactionToTogglePaid) return;
    try {
      await updateTransaction(transactionToTogglePaid.id, { isPaid: !transactionToTogglePaid.isPaid });
      toast({
        title: "Status alterado!",
        description: "O status de pagamento da transação foi atualizado.",
      });
      forceRefetch();
    } catch (error) {
      console.error("Error updating paid status:", error);
      const description = error instanceof Error ? error.message : "Não foi possível alterar o status da transação.";
      toast({
        title: "Erro ao atualizar status",
        description,
        variant: "destructive",
      });
    } finally {
      setTransactionToTogglePaid(null);
    }
  };

  const handleConfirmDelete = async (scope: 'single' | 'future' = 'single') => {
    if (!transactionToDelete) return;
    
    try {
      if (scope === 'future' && transactionToDelete.seriesId) {
        await deleteFutureTransactions(transactionToDelete.seriesId, transactionToDelete.date);
        toast({
          title: "Transações futuras excluídas!",
          description: "A série foi removida com sucesso a partir desta data.",
          variant: 'destructive'
        });
      } else {
        await deleteTransaction(transactionToDelete.id);
        toast({
          title: "Transação excluída!",
          description: "A transação foi removida com sucesso.",
          variant: 'destructive'
        });
      }
      forceRefetch();
    } catch (error) {
       const description = error instanceof Error ? error.message : "Não foi possível remover a(s) transação(ões).";
       toast({
        title: "Erro ao excluir",
        description,
        variant: "destructive",
      });
    } finally {
      setTransactionToDelete(null);
    }
  };
  
  const handleSaveTransaction = async (values: FormValues) => {
    try {
      const { id, isFixed, installments, editScope } = values;
  
      if (id) {
        if (editScope === 'future' && values.seriesId) {
          const updateData = {
            amount: values.amount,
            description: values.description,
            category: values.category,
          };
          await updateFutureTransactions(values.seriesId, values.date, updateData);
          toast({
            title: "Transações futuras atualizadas!",
            description: "A série foi atualizada com sucesso a partir desta data.",
          });
        } else {
          const transactionData = {
            type: values.type,
            amount: values.amount,
            description: values.description,
            category: values.category,
            date: values.date,
            isPaid: values.isPaid,
          };
          await updateTransaction(id, transactionData);
          toast({
            title: "Transação atualizada!",
            description: "Sua transação foi atualizada com sucesso.",
          });
        }
      } else {
        const baseTransactionData = {
          type: values.type,
          amount: values.amount,
          description: values.description,
          category: values.category,
          date: values.date,
          isPaid: values.isPaid,
        };
  
        if (isFixed) {
          const numInstallments = installments || 12;
          const seriesId = uuidv4();
          const batchData: Omit<Transaction, 'id'>[] = [];
          for (let i = 0; i < numInstallments; i++) {
            batchData.push({
              ...baseTransactionData,
              date: addMonths(baseTransactionData.date, i),
              seriesId,
              installment: `${i + 1}/${numInstallments}`,
            });
          }
          await addTransactionsBatch(batchData);
          toast({
            title: "Transações recorrentes adicionadas!",
            description: `${numInstallments} transações foram criadas com sucesso.`,
          });
        } else {
          await addTransaction(baseTransactionData);
          toast({
            title: "Transação adicionada!",
            description: "Sua nova transação foi adicionada com sucesso.",
          });
        }
      }
      forceRefetch();
    } catch (error) {
      console.error(error);
      const description = error instanceof Error ? error.message : "Não foi possível salvar a transação.";
      toast({
        title: "Erro ao salvar",
        description,
        variant: "destructive",
      });
    }
  };
  
  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  return (
    <>
      <div className="flex flex-col items-center justify-center p-4 bg-muted border-dashed border rounded-lg mb-4">
        <h2 className="text-lg font-semibold text-center">Modo de Depuração Ativado</h2>
        <p className="text-muted-foreground text-center text-sm">
          Todos os filtros foram removidos. Exibindo todas as transações do banco de dados.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3 md:gap-8">
          <Skeleton className="h-[125px] w-full" />
          <Skeleton className="h-[125px] w-full" />
          <Skeleton className="h-[125px] w-full" />
        </div>
      ) : (
        <FinancialSummary 
          transactions={transactions} 
          previousBalance={0}
          totalTransactionsCount={transactions.length}
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
          <Button onClick={() => handleAddTransaction('income')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Receita
          </Button>
          <Button variant="secondary" onClick={() => handleAddTransaction('expense')}>
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
              onTogglePaid={handleTogglePaidStatus}
            />
            <TransactionList
              title="Despesas"
              transactions={expenseTransactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onTogglePaid={handleTogglePaidStatus}
            />
          </div>
      )}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={currentTransaction}
        onSave={handleSaveTransaction}
        categories={categories}
      />
      <AlertDialog open={!!transactionToEdit} onOpenChange={(open) => !open && setTransactionToEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Transação Recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta transação faz parte de uma série. O que você gostaria de editar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 sm:gap-2">
            <AlertDialogAction onClick={() => {
              if (!transactionToEdit) return;
              setCurrentTransaction(transactionToEdit);
              setDialogOpen(true);
              setTransactionToEdit(null);
            }}>
              Editar apenas esta transação
            </AlertDialogAction>
            <AlertDialogAction onClick={() => {
              if (!transactionToEdit) return;
              setCurrentTransaction({ ...transactionToEdit, editScope: 'future' });
              setDialogOpen(true);
              setTransactionToEdit(null);
            }}>
              Editar esta e as futuras
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setTransactionToEdit(null)}>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          {transactionToDelete?.seriesId ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Transação Recorrente</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta transação faz parte de uma série. O que você gostaria de excluir?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 sm:gap-2">
                <AlertDialogAction onClick={() => handleConfirmDelete('single')}>
                  Excluir apenas esta transação
                </AlertDialogAction>
                <AlertDialogAction onClick={() => handleConfirmDelete('future')}>
                  Excluir esta e as futuras
                </AlertDialogAction>
                <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
                  Cancelar
                </AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. Isso excluirá permanentemente a sua transação.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleConfirmDelete('single')}>Continuar</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!transactionToTogglePaid} onOpenChange={(open) => !open && setTransactionToTogglePaid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração</AlertDialogTitle>
            <AlertDialogDescription>
              Você deseja alterar o status de pagamento desta transação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToTogglePaid(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTogglePaid}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
