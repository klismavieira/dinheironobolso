
'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { startOfDay } from 'date-fns';

interface TransactionListProps {
  title: string;
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onTogglePaid: (transaction: Transaction) => void;
  type: 'income' | 'expense';
}

export function TransactionList({ title, transactions, onEdit, onDelete, onTogglePaid, type }: TransactionListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    // This only runs on the client, avoiding server/client mismatch
    setToday(startOfDay(new Date()));
  }, []);

  const paidLabel = type === 'income' ? 'Recebido' : 'Pago';
  const togglePaidLabel = type === 'income' ? 'Marcar como recebido' : 'Marcar como pago';

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[450px]">
          <div className="p-6 pt-0">
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction, index) => {
                  const isLate = today && !transaction.isPaid && transaction.date < today;
                  return (
                    <div key={transaction.id}>
                      <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`paid-${transaction.id}`}
                            checked={transaction.isPaid}
                            onCheckedChange={() => onTogglePaid(transaction)}
                            aria-label={togglePaidLabel}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <p className="font-medium">
                              {transaction.description}
                            </p>
                            <div className="text-sm flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{transaction.category}</Badge>
                              {transaction.installment && <Badge variant="secondary">{transaction.installment}</Badge>}
                              <span>{formatDate(transaction.date)}</span>
                              {isLate && <Badge variant="destructive">Atrasado</Badge>}
                              {transaction.isPaid && <Badge className="border-transparent bg-accent text-accent-foreground hover:bg-accent/90">{paidLabel}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            'font-bold text-sm whitespace-nowrap',
                             transaction.type === 'income' ? 'text-accent' : 'text-destructive'
                          )}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(transaction)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(transaction)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        </div>
                      </div>
                      {index < transactions.length - 1 && <Separator className="my-4" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-48 items-center justify-center">
                <CardDescription>Nenhuma transação registrada.</CardDescription>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
