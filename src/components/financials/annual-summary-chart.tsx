"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

export type ChartData = {
  month: string;
  Faturamento: number;
  Despesa: number;
  Saldo: number;
}

interface AnnualSummaryChartProps {
  data: ChartData[];
}

const chartConfig = {
  Faturamento: {
    label: "Faturamento",
    color: "hsl(var(--primary))",
  },
  Despesa: {
    label: "Despesa",
    color: "hsl(var(--destructive))",
  },
  Saldo: {
    label: "Saldo",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function AnnualSummaryChart({ data }: AnnualSummaryChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{
          top: 10,
          right: 10,
          left: 10,
          bottom: 0,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis
          tickFormatter={(value) =>
            new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(Number(value))
          }
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={80}
        />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent
            indicator="dot"
            formatter={(value) => formatCurrency(value as number)}
          />}
        />
        <Legend content={<ChartLegendContent />} />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
        <Line dataKey="Faturamento" type="monotone" stroke="var(--color-Faturamento)" strokeWidth={2} dot={false} />
        <Line dataKey="Despesa" type="monotone" stroke="var(--color-Despesa)" strokeWidth={2} dot={false} />
        <Line dataKey="Saldo" type="monotone" stroke="var(--color-Saldo)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
