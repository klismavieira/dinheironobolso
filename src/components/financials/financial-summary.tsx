'use client';

import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale, CheckCircle2, Banknote } from 'lucide-react';

interface FinancialSummaryProps {
  transactions: Transaction[];
  previousBalance: number;
}

export function FinancialSummary({ transactions, previousBalance }: FinancialSummaryProps) {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const paidIncome = transactions
    .filter((t) => t.type === 'income' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const paidExpenses = transactions
    .filter((t) => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = previousBalance + totalIncome - totalExpenses;
  const paidBalance = paidIncome - paidExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Resumo do Período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Anterior</CardTitle>
              <Banknote className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${previousBalance >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatCurrency(previousBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Saldo do mês anterior</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">Total de entradas no período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesa do Mês</CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">Total de saídas no período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Previsto</CardTitle>
              <Scale className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground">Balanço total do período</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3 text-muted-foreground">Resumo Realizado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          <Card className="shadow-none border-dashed">
            <CardContent className="p-3">
              <div className="flex flex-row items-center justify-between space-y-0 mb-1">
                <p className="text-xs font-medium text-muted-foreground">Receitas Pagas</p>
                <CheckCircle2 className="h-4 w-4 text-accent" />
              </div>
              <div className="text-lg font-bold">{formatCurrency(paidIncome)}</div>
            </CardContent>
          </Card>
          <Card className="shadow-none border-dashed">
            <CardContent className="p-3">
              <div className="flex flex-row items-center justify-between space-y-0 mb-1">
                <p className="text-xs font-medium text-muted-foreground">Despesas Pagas</p>
                <CheckCircle2 className="h-4 w-4 text-destructive" />
              </div>
              <div className="text-lg font-bold">{formatCurrency(paidExpenses)}</div>
            </CardContent>
          </Card>
          <Card className="shadow-none border-dashed">
            <CardContent className="p-3">
              <div className="flex flex-row items-center justify-between space-y-0 mb-1">
                <p className="text-xs font-medium text-muted-foreground">Saldo Realizado</p>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className={`text-lg font-bold ${paidBalance >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatCurrency(paidBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
