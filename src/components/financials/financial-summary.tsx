
'use client';

import type { Transaction } from '@/lib/types';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, CircleDollarSign, AlertCircle, Scale, Wallet, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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

  // Previsão
  const plannedIncomes = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const plannedExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  
  const plannedBalance = previousBalance + plannedIncomes - plannedExpenses;
  
  // Movimentação
  const realizedIncomes = transactions
    .filter((t) => t.type === 'income' && t.isPaid)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const pendingExpenses = transactions
    .filter((t) => t.type === 'expense' && !t.isPaid)
    .reduce((acc, t) => acc + t.amount, 0);

  const realizedExpenses = transactions
    .filter((t) => t.type === 'expense' && t.isPaid)
    .reduce((acc, t) => acc + t.amount, 0);

  const pocketMoney = previousBalance + realizedIncomes - realizedExpenses;

  return (
    <div className="space-y-4 mb-4">
      <div>
        <h3 className="text-lg font-medium mb-4">Previsão financeira</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                previousBalance < 0 ? "text-destructive" : ""
              )}>
                {formatCurrency(previousBalance)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receitas previstas
              </CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {formatCurrency(plannedIncomes)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Despesas previstas
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(plannedExpenses)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Saldo previsto
              </CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                plannedBalance < 0 ? "text-destructive" : "text-primary"
              )}>
                {formatCurrency(plannedBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-medium mb-4">Movimentação atual</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dinheiro no bolso
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                pocketMoney < 0 ? "text-destructive" : "text-primary"
              )}>
                {formatCurrency(pocketMoney)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Contas pendentes
              </CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(pendingExpenses)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
