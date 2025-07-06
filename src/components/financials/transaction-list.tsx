'use client';

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
}

export function TransactionList({ title, transactions, onEdit, onDelete, onTogglePaid }: TransactionListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  const today = startOfDay(new Date());

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
                  const isLate = !transaction.isPaid && transaction.date < today;
                  return (
                    <div key={transaction.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            id={`paid-${transaction.id}`}
                            checked={transaction.isPaid}
                            onCheckedChange={() => onTogglePaid(transaction)}
                            aria-label="Marcar como pago"
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="font-medium">
                              {transaction.description}
                            </p>
                            <div className="text-sm flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{transaction.category}</Badge>
                              {transaction.installment && <Badge variant="secondary">{transaction.installment}</Badge>}
                              <span>{formatDate(transaction.date)}</span>
                              {isLate && <Badge variant="destructive">Atrasado</Badge>}
                              {transaction.isPaid && <Badge className="border-transparent bg-accent text-accent-foreground hover:bg-accent/90">Pago</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            'font-bold text-sm',
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
