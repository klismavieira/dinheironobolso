'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import {
  onTransactionsUpdate,
  addTransaction,
  updateTransaction,
  updateFutureTransactions,
  deleteTransaction,
  deleteFutureTransactions,
  addTransactionsBatch,
  onCategoriesUpdate,
  type Categories,
  getTransactionsForPeriod,
  getTotalTransactionCount,
} from '@/lib/firestoreService';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { FinancialSummary } from '@/components/financials/financial-summary';
import { TransactionList } from '@/components/financials/transaction-list';
import { TransactionDialog, type FormValues } from '@/components/financials/transaction-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
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
import { format, startOfMonth, endOfMonth, setMonth, getMonth, addMonths, subMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


export default function Home() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction> & { editScope?: 'future' } | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToTogglePaid, setTransactionToTogglePaid] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Categories>({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [previousBalance, setPreviousBalance] = useState(0);
  const [totalTransactionsCount, setTotalTransactionsCount] = useState<number | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after hydration, to avoid mismatch
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });

    const fetchTotalCount = async () => {
      try {
        const count = await getTotalTransactionCount();
        setTotalTransactionsCount(count);
      } catch (error) {
          const description = error instanceof Error ? error.message : "Não foi possível buscar a contagem total.";
          toast({
            title: "Erro ao buscar dados",
            description,
            variant: "destructive",
          });
      }
    };
    fetchTotalCount();
  }, []);

  useEffect(() => {
    // Only fetch transactions when dateRange is defined
    if (!dateRange?.from || !dateRange?.to) {
        return; // Keep loading until dateRange is initialized
    }

    setLoading(true);
    const unsubscribe = onTransactionsUpdate(
      dateRange.from,
      dateRange.to,
      (updatedTransactions) => {
        setTransactions(updatedTransactions);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        toast({
          title: "Erro ao buscar transações",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [dateRange]);

  useEffect(() => {
    if (!dateRange?.from) {
      setPreviousBalance(0);
      return;
    };

    const calculatePreviousBalance = async () => {
      try {
        const prevMonth = subMonths(dateRange.from, 1);
        const prevMonthStart = startOfMonth(prevMonth);
        const prevMonthEnd = endOfMonth(prevMonth);

        const prevMonthTransactions = await getTransactionsForPeriod(prevMonthStart, prevMonthEnd);
        
        const income = prevMonthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = prevMonthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        setPreviousBalance(income - expenses);

      } catch (error) {
        console.error("Error calculating previous balance:", error);
        const description = error instanceof Error ? error.message : "Não foi possível buscar os dados do mês anterior.";
        toast({
          title: "Erro ao calcular saldo anterior",
          description,
          variant: "destructive",
        });
        setPreviousBalance(0); // Reset on error
      }
    };

    calculatePreviousBalance();
  }, [dateRange, toast]);
  
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
  }, [toast]);


  const handleAddTransaction = (type: 'income' | 'expense') => {
    setCurrentTransaction({ type, date: dateRange?.from || new Date() });
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    if (transaction.seriesId) {
      setTransactionToEdit(transaction); // Opens the new scope dialog
    } else {
      setCurrentTransaction(transaction); // Non-recurring: open dialog directly
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
        // --- UPDATE ---
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
          // For single transaction update, we gather all editable fields.
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
        // --- CREATE ---
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
          // For a single transaction, we pass the clean base data.
          // This object does not have `seriesId` or `installment`, solving the bug.
          await addTransaction(baseTransactionData);
          toast({
            title: "Transação adicionada!",
            description: "Sua nova transação foi adicionada com sucesso.",
          });
        }
      }
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

  const handleMonthClick = (monthIndex: number) => {
    const referenceDate = dateRange?.from || new Date();
    const targetMonthDate = setMonth(referenceDate, monthIndex);
    setDateRange({
      from: startOfMonth(targetMonthDate),
      to: endOfMonth(targetMonthDate),
    });
  };

  const getActiveMonth = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return -1;
    }
    const fromStartOfMonth = startOfMonth(dateRange.from);
    const fromEndOfMonth = endOfMonth(dateRange.from);

    if (
      dateRange.from.getTime() === fromStartOfMonth.getTime() &&
      dateRange.to?.getTime() === fromEndOfMonth.getTime()
    ) {
      return getMonth(dateRange.from);
    }
    return -1;
  };

  const activeMonth = getActiveMonth();
  const months = Array.from({ length: 12 }, (_, i) => {
      const referenceDate = dateRange?.from || new Date();
      const monthName = format(setMonth(referenceDate, i), 'MMM', { locale: ptBR });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
  });


  return (
    <>
      <div className="flex items-center justify-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full sm:w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                <span>Selecione um período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
          {months.map((month, index) => (
              <Button
                  key={month}
                  variant={activeMonth === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleMonthClick(index)}
              >
                  {month}
              </Button>
          ))}
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
          previousBalance={previousBalance}
          totalTransactionsCount={totalTransactionsCount}
        />
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
