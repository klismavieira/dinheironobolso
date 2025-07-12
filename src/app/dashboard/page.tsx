
'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { getTransactionsForPeriod, getTransactionsBeforeDate } from '@/lib/firestoreService';
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
import { CategoryPieChart, type PieChartData } from '@/components/financials/category-pie-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [annualChartData, setAnnualChartData] = useState<ChartData[]>([]);
  const [expensePieData, setExpensePieData] = useState<PieChartData[]>([]);
  const [incomePieData, setIncomePieData] = useState<PieChartData[]>([]);
  const [annualLoading, setAnnualLoading] = useState(true);
  const [pieLoading, setPieLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    // This effect runs only on the client, after hydration, to avoid mismatch
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
  }, []);

  // Fetch annual data for the line chart (runs once)
  useEffect(() => {
    const fetchAnnualData = async () => {
      setAnnualLoading(true);
      const yearStart = startOfYear(new Date());
      const yearEnd = endOfYear(new Date());

      // Fetch transactions for the year and balance before the year
      const transactions = await getTransactionsForPeriod(yearStart, yearEnd);
      const previousTransactions = await getTransactionsBeforeDate(yearStart);
      
      let runningBalance = previousTransactions.reduce((acc, t) => {
        return acc + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);

      const monthlyData: { [key: string]: { income: number; expense: number } } = {};
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
      
      const intervalMonths = eachMonthOfInterval({ start: yearStart, end: yearEnd });
      
      const lineChartData: ChartData[] = intervalMonths.map(monthDate => {
        const monthKey = format(monthDate, 'MMM/yy', { locale: ptBR });
        const monthAggregates = monthlyData[monthKey] || { income: 0, expense: 0 };
        const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });
        
        runningBalance += monthAggregates.income - monthAggregates.expense;

        const chartDataItem = {
          month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          Faturamento: monthAggregates.income,
          Despesa: monthAggregates.expense,
          Saldo: runningBalance,
        };
        
        return chartDataItem;
      });

      setAnnualChartData(lineChartData);
      setAnnualLoading(false);
    };

    fetchAnnualData();
  }, []);

  // Fetch pie chart data based on selected dateRange
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    const fetchPieData = async () => {
      setPieLoading(true);
      const transactions = await getTransactionsForPeriod(dateRange.from, dateRange.to);
      const colors = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
      ];

      // --- Expense Pie Chart Data Processing ---
      const expenseByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          if (!acc[t.category]) {
            acc[t.category] = 0;
          }
          acc[t.category] += t.amount;
          return acc;
        }, {} as { [key: string]: number });

      const expensePieChartData: PieChartData[] = Object.entries(expenseByCategory)
        .map(([category, total], index) => ({
          category,
          total,
          fill: colors[index % colors.length],
        }))
        .sort((a, b) => b.total - a.total);

      setExpensePieData(expensePieChartData);

      // --- Income Pie Chart Data Processing ---
      const incomeByCategory = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => {
          if (!acc[t.category]) {
            acc[t.category] = 0;
          }
          acc[t.category] += t.amount;
          return acc;
        }, {} as { [key: string]: number });
      
      const incomePieChartData: PieChartData[] = Object.entries(incomeByCategory)
        .map(([category, total], index) => ({
          category,
          total,
          fill: colors[index % colors.length],
        }))
        .sort((a, b) => b.total - a.total);

      setIncomePieData(incomePieChartData);

      setPieLoading(false);
    };

    fetchPieData();
  }, [dateRange]);

  const handleMonthClick = (monthIndex: number) => {
    const referenceDate = dateRange?.from || new Date();
    const targetMonthDate = setMonth(referenceDate, monthIndex);
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
    const referenceDate = dateRange?.from || new Date();
    const monthName = format(setMonth(referenceDate, i), 'MMM', { locale: ptBR });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Faturamento/Despesa</CardTitle>
          <CardDescription>Resumo do ano corrente.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {annualLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <AnnualSummaryChart data={annualChartData} />
          )}
        </CardContent>
      </Card>
      
      <div className="flex flex-col items-center justify-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={'outline'}
              className={cn('w-full sm:w-[300px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
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

      <div className="grid grid-cols-1 md:grid-cols-2 md:items-start gap-4">
        {pieLoading ? (
          <>
            <Skeleton className="h-full w-full min-h-[450px]" />
            <Skeleton className="h-full w-full min-h-[450px]" />
          </>
        ) : (
          <>
            {incomePieData.length > 0 ? (
              <CategoryPieChart 
                data={incomePieData} 
                title="Receitas por Categoria" 
                description="Distribuição das receitas no período selecionado."
                type="income"
              />
            ) : (
              <Card className="flex items-center justify-center min-h-[450px]">
                <CardDescription>Nenhuma receita no período.</CardDescription>
              </Card>
            )}
            {expensePieData.length > 0 ? (
              <CategoryPieChart 
                data={expensePieData} 
                title="Despesas por Categoria" 
                description="Distribuição das despesas no período selecionado."
                type="expense"
              />
            ) : (
              <Card className="flex items-center justify-center min-h-[450px]">
                <CardDescription>Nenhuma despesa no período.</CardDescription>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
