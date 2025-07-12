
'use client';

import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale, CheckCircle2, Coins, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialSummaryProps {
  transactions: Transaction[];
  previousBalance: number;
}

export function FinancialSummary({ transactions, previousBalance }: FinancialSummaryProps) {
  // --- Totals for "Previsão do Período" section ---
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const predictedBalance = previousBalance + totalIncome - totalExpenses;

  // --- Totals for "Resumo Realizado" section (based on paid status) ---
  const paidIncome = transactions
    .filter((t) => t.type === 'income' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const paidExpenses = transactions
    .filter((t) => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  // This is the total money that has actually entered your account this period
  const currentRevenue = previousBalance + paidIncome;

  // This is the final cash in hand after paid expenses are deducted
  const cashInHand = currentRevenue - paidExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Previsão do Período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Prevista</CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-xl font-bold">{formatCurrency(totalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesa Prevista</CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-xl font-bold">{formatCurrency(totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balanço Previsto</CardTitle>
              <Scale className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn('text-lg md:text-xl font-bold', predictedBalance >= 0 ? 'text-accent' : 'text-destructive')}>
                {formatCurrency(predictedBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Resumo Realizado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita atual</CardTitle>
                <Coins className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-xl font-bold text-accent">
                  {formatCurrency(currentRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-xl font-bold">{formatCurrency(paidExpenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo em Caixa</CardTitle>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn('text-lg md:text-xl font-bold', cashInHand >= 0 ? 'text-primary' : 'text-destructive')}>
                  {formatCurrency(cashInHand)}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
