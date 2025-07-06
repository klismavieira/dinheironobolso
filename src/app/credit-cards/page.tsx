'use client';

import { useState, useEffect } from 'react';
import {
  onCreditCardsUpdate,
  addCreditCard,
  updateCreditCard,
  deleteCreditCard,
  onCategoriesUpdate,
  addCardExpense,
  type Categories,
} from '@/lib/firestoreService';
import type { CreditCard, CardExpense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle } from 'lucide-react';
import { CreditCardDialog, type FormValues as CreditCardFormValues } from '@/components/credit-cards/credit-card-dialog';
import { CardExpenseDialog, type FormValues as CardExpenseFormValues } from '@/components/credit-cards/card-expense-dialog';
import { CreditCardView } from '@/components/credit-cards/credit-card-view';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';

export default function CreditCardsPage() {
  const { toast } = useToast();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Categories>({ income: [], expense: EXPENSE_CATEGORIES });

  // Dialog states
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [currentCard, setCurrentCard] = useState<Partial<CreditCard> | null>(null);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [cardForNewExpense, setCardForNewExpense] = useState<string | null>(null);


  useEffect(() => {
    const unsubscribe = onCreditCardsUpdate(
      (updatedCards) => {
        setCards(updatedCards);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching credit cards:", error);
        toast({ title: "Erro ao buscar cartões", variant: "destructive" });
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    const unsubscribe = onCategoriesUpdate(setCategories, (error) => {
        console.error("Error fetching categories:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleAddCard = () => {
    setCurrentCard({});
    setCardDialogOpen(true);
  };
  
  const handleEditCard = (card: CreditCard) => {
    setCurrentCard(card);
    setCardDialogOpen(true);
  };

  const handleSaveCard = async (values: CreditCardFormValues) => {
    try {
      if (values.id) {
        await updateCreditCard(values.id, values);
        toast({ title: "Cartão atualizado com sucesso!" });
      } else {
        await addCreditCard(values);
        toast({ title: "Cartão adicionado com sucesso!" });
      }
    } catch (error) {
      toast({ title: "Erro ao salvar cartão", variant: "destructive" });
    }
  };
  
  const handleConfirmDeleteCard = async () => {
    if (!cardToDelete) return;
    try {
        await deleteCreditCard(cardToDelete);
        toast({ title: "Cartão excluído!", variant: 'destructive' });
    } catch(error) {
        toast({ title: "Erro ao excluir cartão", variant: 'destructive' });
    } finally {
        setCardToDelete(null);
    }
  }

  const handleAddExpenseToCard = (cardId: string) => {
    setCardForNewExpense(cardId);
    setExpenseDialogOpen(true);
  }

  const handleSaveCardExpense = async (values: CardExpenseFormValues) => {
    if (!cardForNewExpense) return;
    try {
      const targetCard = cards.find(c => c.id === cardForNewExpense);
      if (!targetCard) throw new Error("Cartão não encontrado");

      // Determine billing cycle
      const purchaseDate = values.date;
      const billingCycleDate = new Date(purchaseDate);
      if (purchaseDate.getDate() > targetCard.closingDay) {
          billingCycleDate.setMonth(purchaseDate.getMonth() + 1);
      }
      const billingCycle = format(billingCycleDate, 'yyyy-MM');

      const expenseData: Omit<CardExpense, 'id'> = {
        cardId: cardForNewExpense,
        description: values.description,
        amount: values.amount,
        category: values.category,
        date: values.date,
        isBilled: false,
        billingCycle: billingCycle,
      };
      await addCardExpense(cardForNewExpense, expenseData);
      toast({ title: "Despesa adicionada ao cartão!" });
    } catch (error) {
      toast({ title: "Erro ao salvar despesa do cartão", variant: "destructive" });
    } finally {
      setCardForNewExpense(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus Cartões de Crédito</h1>
        <Button onClick={handleAddCard}>
          <PlusCircle className="mr-2" />
          Adicionar Cartão
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {cards.map(card => (
            <CreditCardView
              key={card.id}
              card={card}
              onEdit={handleEditCard}
              onDelete={() => setCardToDelete(card.id)}
              onAddExpense={handleAddExpenseToCard}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
            <h2 className="text-xl font-semibold">Nenhum cartão cadastrado</h2>
            <p className="text-muted-foreground mt-2 mb-4">Adicione seu primeiro cartão para começar a controlar suas faturas.</p>
            <Button onClick={handleAddCard}>
                <PlusCircle className="mr-2" />
                Adicionar Cartão
            </Button>
        </div>
      )}

      <CreditCardDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        card={currentCard}
        onSave={handleSaveCard}
      />
      
      <CardExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={{}}
        onSave={handleSaveCardExpense}
        categories={categories}
      />
      
      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá o cartão permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCard}>Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
