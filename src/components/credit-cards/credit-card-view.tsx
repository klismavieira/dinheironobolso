'use client';
import type { CreditCard, CardExpense } from '@/lib/types';
import { useState, useEffect } from 'react';
import { onCardExpensesUpdate, deleteCardExpense, deleteFutureCardExpenses, closeCreditCardBill } from '@/lib/firestoreService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, PlusCircle, FileCheck2 } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface CreditCardViewProps {
    card: CreditCard;
    onEdit: (card: CreditCard) => void;
    onDelete: (cardId: string) => void;
    onAddExpense: (cardId: string) => void;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
const formatDate = (date: Date) => new Intl.DateTimeFormat('pt-BR').format(date);

export function CreditCardView({ card, onEdit, onDelete, onAddExpense }: CreditCardViewProps) {
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<CardExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<Date>(new Date());
    const [expenseToDelete, setExpenseToDelete] = useState<CardExpense | null>(null);
    const [isClosingBill, setIsClosingBill] = useState(false);

    const formattedBillingCycle = format(billingCycle, 'yyyy-MM');

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onCardExpensesUpdate(card.id, formattedBillingCycle,
            (updatedExpenses) => {
                setExpenses(updatedExpenses);
                setLoading(false);
            },
            (error) => {
                console.error(error);
                toast({ title: "Erro ao buscar despesas do cartão", variant: "destructive" });
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [card.id, formattedBillingCycle, toast]);

    const handleDeleteExpense = async (scope: 'single' | 'future' = 'single') => {
        if (!expenseToDelete) return;
        try {
            if (scope === 'future' && expenseToDelete.seriesId) {
                await deleteFutureCardExpenses(card.id, expenseToDelete.seriesId, expenseToDelete.date);
                toast({ title: "Despesas futuras excluídas!", variant: 'destructive' });
            } else {
                await deleteCardExpense(card.id, expenseToDelete.id);
                toast({ title: "Despesa do cartão excluída!" });
            }
        } catch (error) {
            toast({ title: "Erro ao excluir despesa", variant: "destructive" });
        } finally {
            setExpenseToDelete(null);
        }
    };

    const handleCloseBill = async () => {
        setIsClosingBill(true);
        try {
            await closeCreditCardBill(card, formattedBillingCycle);
            toast({ title: "Fatura fechada com sucesso!", description: "Uma nova despesa foi criada no seu extrato." });
        } catch (error: any) {
            toast({ title: "Erro ao fechar fatura", description: error.message, variant: "destructive" });
        } finally {
            setIsClosingBill(false);
        }
    }
    
    const unbilledExpenses = expenses.filter(e => !e.isBilled);
    const totalUnbilled = unbilledExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthName = format(billingCycle, 'MMMM yyyy', { locale: ptBR });

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>{card.name}</CardTitle>
                    <CardDescription>Limite: {formatCurrency(card.limit)}</CardDescription>
                    <div className="text-xs text-muted-foreground mt-1">
                        <span>Fecha dia {card.closingDay}</span> &bull; <span>Vence dia {card.dueDay}</span>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(card)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(card.id)} className="text-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                         <Button variant="outline" size="sm" onClick={() => setBillingCycle(subMonths(billingCycle, 1))}>Anterior</Button>
                         <span className="font-medium text-sm capitalize w-28 text-center">{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
                         <Button variant="outline" size="sm" onClick={() => setBillingCycle(subMonths(billingCycle, -1))}>Próximo</Button>
                    </div>
                    <Button size="sm" onClick={() => onAddExpense(card.id)}><PlusCircle className="mr-2" /> Nova Despesa</Button>
                </div>
                <Separator />
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                    {loading ? <Skeleton className="h-20 w-full" /> : (
                        unbilledExpenses.length > 0 ? unbilledExpenses.map(expense => (
                            <div key={expense.id} className="flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-medium">{expense.description}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>{formatDate(expense.date)} - {expense.category}</span>
                                        {expense.installment && <Badge variant="secondary" className="font-normal">{expense.installment}</Badge>}
                                    </p>
                                </div>
                                <div className='flex items-center'>
                                  <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setExpenseToDelete(expense)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        )) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa para esta fatura.</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 flex justify-between items-center">
                <div>
                    <p className="text-sm font-semibold">Fatura Aberta</p>
                    <p className="text-xl font-bold">{formatCurrency(totalUnbilled)}</p>
                </div>
                <Button onClick={handleCloseBill} disabled={isClosingBill || totalUnbilled === 0}>
                    <FileCheck2 className="mr-2" />
                    {isClosingBill ? 'Fechando...' : 'Fechar Fatura'}
                </Button>
            </CardFooter>
            <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
                <AlertDialogContent>
                    {expenseToDelete?.seriesId ? (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Despesa Recorrente</AlertDialogTitle>
                                <AlertDialogDescription>
                                Esta despesa faz parte de uma série. O que você gostaria de excluir?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 sm:gap-2">
                                <AlertDialogAction onClick={() => handleDeleteExpense('single')}>
                                Excluir apenas esta despesa
                                </AlertDialogAction>
                                <AlertDialogAction onClick={() => handleDeleteExpense('future')}>
                                Excluir esta e as futuras
                                </AlertDialogAction>
                                <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>
                                Cancelar
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </>
                    ) : (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Despesa?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExpense('single')}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
