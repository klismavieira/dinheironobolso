
'use client';

import type { Transaction } from '@/lib/types';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Banknote, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialSummaryProps {
  transactions: Transaction[];
  previousBalance: number;
}

export function FinancialSummary({ transactions, previousBalance }: FinancialSummaryProps) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const receivedIncomes = transactions
    .filter((t) => t.type === 'income' && t.isPaid)
    .reduce((acc, t) => acc + t.amount, 0);
  
  return (
    <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Saldo anterior
          </CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            previousBalance < 0 ? "text-destructive" : "text-primary"
          )}>
            {formatCurrency(previousBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Valor do fechamento do mês anterior.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Receita atual
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">
            {formatCurrency(receivedIncomes)}
          </div>
          <p className="text-xs text-muted-foreground">
            Soma de todas as receitas recebidas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
