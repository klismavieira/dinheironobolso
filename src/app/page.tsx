'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import {
  onTransactionsUpdate,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  deleteFutureTransactions,
  onCategoriesUpdate,
  type Categories,
} from '@/lib/firestoreService';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { Header } from '@/components/layout/header';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addMonths, differenceInCalendarMonths, format, startOfMonth, endOfMonth, setMonth, getMonth } from 'date-fns';
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
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction> | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleteSingleDialogOpen, setDeleteSingleDialogOpen] = useState(false);
  const [deleteSeriesDialogOpen, setDeleteSeriesDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Categories>({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) {
        setTransactions([]);
        setLoading(false);
        return;
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
          description: "Não foi possível carregar os dados. Tente novamente mais tarde.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
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
          description: "Não foi possível carregar as categorias personalizadas.",
          variant: "destructive",
        });
      }
    );

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

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    if (transaction.isRecurring && transaction.seriesId) {
      setDeleteSeriesDialogOpen(true);
    } else {
      setDeleteSingleDialogOpen(true);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteTransaction(transactionToDelete.id);
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
    } finally {
      setTransactionToDelete(null);
      setDeleteSingleDialogOpen(false);
      setDeleteSeriesDialogOpen(false); // Close both dialogs
    }
  };
  
  const handleConfirmSeriesDelete = async () => {
    if (!transactionToDelete?.seriesId) return;
    try {
      await deleteFutureTransactions(transactionToDelete.seriesId, transactionToDelete.date);
       toast({
        title: "Transações futuras excluídas!",
        description: "Esta transação e as futuras foram removidas.",
        variant: 'destructive'
      });
    } catch (error) {
       toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover as transações recorrentes.",
        variant: "destructive",
      });
    } finally {
      setTransactionToDelete(null);
      setDeleteSeriesDialogOpen(false);
    }
  };

  const handleSaveTransaction = async (values: FormValues) => {
    try {
      const { id } = values;

      if (id) {
        // --- UPDATE EXISTING TRANSACTION ---
        const dataToUpdate: Partial<Omit<Transaction, 'id' | 'isRecurring' | 'seriesId'>> = {
          type: values.type,
          amount: values.amount,
          description: values.description,
          category: values.category,
          date: values.date,
        };
        await updateTransaction(id, dataToUpdate);
        toast({
          title: "Transação atualizada!",
          description: "Sua transação foi atualizada com sucesso.",
        });
      } else {
        // --- CREATE NEW TRANSACTION(S) ---
        const { type, amount, description, category, date, isFixed, endDate } = values;

        // Definitive fix: Build a new, clean object from scratch to ensure
        // no invalid properties (like `id: undefined`) are ever sent.
        const baseTransactionData: Omit<Transaction, 'id' | 'seriesId'> = {
            type,
            amount,
            description,
            category,
            date,
            isRecurring: false, // Default to false, will be overridden if fixed
        };

        if (isFixed) {
          // RECURRING ADD
          const startDate = baseTransactionData.date;
          const finalDate = endDate || addMonths(startDate, 11);
          
          if (finalDate < startDate) {
             toast({
              title: "Erro de data",
              description: "A data final não pode ser anterior à data da transação.",
              variant: "destructive",
            });
            return;
          }

          const installments = differenceInCalendarMonths(finalDate, startDate) + 1;
          const seriesId = doc(collection(db, 'transactions')).id;
          
          const promises = [];
          for (let i = 0; i < installments; i++) {
            const newDate = addMonths(startDate, i);
            const newDescription = installments > 1 && type === 'expense'
              ? `${description} (${i + 1}/${installments})`
              : description;
            
            promises.push(addTransaction({
              ...baseTransactionData,
              date: newDate,
              description: newDescription,
              isRecurring: true,
              seriesId: seriesId,
            }));
          }
          await Promise.all(promises);

          toast({
            title: "Transações recorrentes adicionadas!",
            description: `${installments} transação(ões) foram adicionadas com sucesso.`,
          });
        } else {
          // SINGLE ADD
          await addTransaction(baseTransactionData);
          toast({
            title: "Transação adicionada!",
            description: "Sua nova transação foi adicionada com sucesso.",
          });
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a transação.",
        variant: "destructive",
      });
    }
  };
  
  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  const handleMonthClick = (monthIndex: number) => {
    const today = new Date();
    const targetMonthDate = setMonth(today, monthIndex);
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
      const monthName = format(setMonth(new Date(), i), 'MMM', { locale: ptBR });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
  });


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">
        <div className="flex items-center justify-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
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
        categories={categories}
      />
      <AlertDialog open={deleteSingleDialogOpen} onOpenChange={setDeleteSingleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente a sua transação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSingleDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={deleteSeriesDialogOpen} onOpenChange={setDeleteSeriesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Transação Recorrente</DialogTitle>
            <DialogDescription>
              Esta é uma transação recorrente. Escolha uma das opções abaixo para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-4">
            <Button
              variant="outline"
              onClick={handleConfirmSingleDelete}
            >
              Excluir somente esta transação
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSeriesDelete}
            >
              Excluir esta e as transações futuras
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
