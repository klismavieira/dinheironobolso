'use client';

import { useState, useEffect } from 'react';
import { getTransactionsForPeriod } from '@/lib/firestoreService';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnnualSummaryChart, type ChartData } from '@/components/financials/annual-summary-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnualData = async () => {
      setLoading(true);
      const data: ChartData[] = [];
      const today = new Date();

      // Fetch data for the last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(today, i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);

        const transactions = await getTransactionsForPeriod(startDate, endDate);
        
        const faturamento = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const despesa = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const saldo = faturamento - despesa;
        
        const monthLabel = format(startDate, 'MMM/yy', { locale: ptBR });

        data.push({
          month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          Faturamento: faturamento,
          Despesa: despesa,
          Saldo: saldo,
        });
      }

      setChartData(data);
      setLoading(false);
    };

    fetchAnnualData();
  }, []);

  return (
      <Card>
        <CardHeader>
          <CardTitle>Faturamento/Despesa</CardTitle>
          <CardDescription>Resumo dos últimos 12 meses.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <AnnualSummaryChart data={chartData} />
          )}
        </CardContent>
      </Card>
  );
}
