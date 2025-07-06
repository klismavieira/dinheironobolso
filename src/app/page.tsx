'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import {
  onTransactionsUpdate,
  addTransaction,
  updateTransaction,
  deleteTransaction,
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
import { addMonths, differenceInCalendarMonths, format, startOfMonth, endOfMonth } from 'date-fns';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
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

  const handleDeleteTransaction = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteTransaction(transactionToDelete);
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
      setDeleteDialogOpen(false);
    }
  };

  const handleSaveTransaction = async (values: FormValues) => {
    try {
      if (values.id) {
        // Logic for updating an existing transaction
        const { id, isFixed, endDate, ...dataToUpdate } = values;
        await updateTransaction(id, dataToUpdate);
        toast({
          title: "Transação atualizada!",
          description: "Sua transação foi atualizada com sucesso.",
        });
      } else {
        // Logic for adding a new transaction
        const { isFixed, endDate, ...dataToAdd } = values;

        if (isFixed) {
          // Recurring transaction
          const startDate = dataToAdd.date;
          // Default to 11 months in the future, for a total of 12 occurrences
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
          
          for (let i = 0; i < installments; i++) {
            const newDate = addMonths(startDate, i);
            const newDescription = installments > 1 
              ? `${dataToAdd.description} (${i + 1}/${installments})`
              : dataToAdd.description;
            
            const transactionData: Omit<Transaction, 'id'> = {
              ...dataToAdd,
              date: newDate,
              description: newDescription,
            };
            await addTransaction(transactionData);
          }
          toast({
            title: "Transações recorrentes adicionadas!",
            description: `${installments} transação(ões) foram adicionadas com sucesso.`,
          });
        } else {
          // Single transaction
          await addTransaction(dataToAdd);
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente a sua transação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
