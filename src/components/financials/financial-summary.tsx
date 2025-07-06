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
        <div className="grid gap-4 md:grid-cols-4 md:gap-8">
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
        <h2 className="text-xl font-semibold mb-4 text-foreground">Resumo Realizado</h2>
        <div className="grid gap-4 md:grid-cols-3 md:gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas Pagas</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(paidIncome)}</div>
              <p className="text-xs text-muted-foreground">Total de entradas recebidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(paidExpenses)}</div>
              <p className="text-xs text-muted-foreground">Total de saídas efetivadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Realizado</CardTitle>
              <Scale className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${paidBalance >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatCurrency(paidBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Balanço das contas pagas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
