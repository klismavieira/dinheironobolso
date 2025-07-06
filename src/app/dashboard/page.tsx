'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getTransactionsForPeriod } from '@/lib/firestoreService';
import {
  startOfMonth,
  endOfMonth,
  format,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  setMonth,
  getMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnnualSummaryChart, type ChartData } from '@/components/financials/annual-summary-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    // Set initial range to current year on client-side to avoid hydration mismatch
    const today = new Date();
    setDateRange({
      from: startOfYear(today),
      to: endOfYear(today),
    });
  }, []);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    const fetchChartData = async () => {
      setLoading(true);

      const transactions = await getTransactionsForPeriod(dateRange.from, dateRange.to);

      const monthlyData: { [key: string]: { income: number; expense: number } } = {};

      // Group transactions by month
      transactions.forEach(t => {
        const monthKey = format(t.date, 'MMM/yy', { locale: ptBR });
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
          monthlyData[monthKey].income += t.amount;
        } else {
          monthlyData[monthKey].expense += t.amount;
        }
      });

      // Get all months in the selected interval to prevent gaps in the chart
      const intervalMonths = eachMonthOfInterval({
        start: dateRange.from,
        end: dateRange.to,
      });

      const data: ChartData[] = intervalMonths.map(monthDate => {
        const monthKey = format(monthDate, 'MMM/yy', { locale: ptBR });
        const monthAggregates = monthlyData[monthKey] || { income: 0, expense: 0 };

        const faturamento = monthAggregates.income;
        const despesa = monthAggregates.expense;
        const saldo = faturamento - despesa;

        const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });

        return {
          month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          Faturamento: faturamento,
          Despesa: despesa,
          Saldo: saldo,
        };
      });

      setChartData(data);
      setLoading(false);
    };

    fetchChartData();
  }, [dateRange]);

  const handleMonthClick = (monthIndex: number) => {
    const today = new Date();
    const targetMonthDate = setMonth(today, monthIndex);
    setDateRange({
      from: startOfMonth(targetMonthDate),
      to: endOfMonth(targetMonthDate),
    });
  };

  const getActiveMonth = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return -1;
    }
    const fromStartOfMonth = startOfMonth(dateRange.from);
    const fromEndOfMonth = endOfMonth(dateRange.from);

    if (
      dateRange.from.getTime() === fromStartOfMonth.getTime() &&
      dateRange.to?.getTime() === fromEndOfMonth.getTime()
    ) {
      return getMonth(dateRange.from);
    }
    return -1;
  };

  const activeMonth = getActiveMonth();
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthName = format(setMonth(new Date(), i), 'MMM', { locale: ptBR });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center justify-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={'outline'}
              className={cn('w-[300px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                    {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                )
              ) : (
                <span>Selecione um período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {months.map((month, index) => (
            <Button
              key={month}
              variant={activeMonth === index ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleMonthClick(index)}
            >
              {month}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento/Despesa</CardTitle>
          <CardDescription>Resumo do período selecionado.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <AnnualSummaryChart data={chartData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
