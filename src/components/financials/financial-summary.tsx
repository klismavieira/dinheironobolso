
'use client';

import type { Transaction } from '@/lib/types';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialSummaryProps {
  transactions: Transaction[];
  previousBalance: number;
}

export function FinancialSummary({ previousBalance }: FinancialSummaryProps) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
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
    </div>
  );
}
