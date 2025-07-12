
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, LabelList } from 'recharts';
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
    color: "hsl(var(--chart-2))",
  },
  Despesa: {
    label: "Despesa",
    color: "hsl(var(--destructive))",
  },
  Saldo: {
    label: "Saldo",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCompactNumber = (value: number) => {
  if (value === 0) return null;
  return new Intl.NumberFormat('pt-BR', {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}


export function AnnualSummaryChart({ data }: AnnualSummaryChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{
          top: 30,
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
            formatter={(value) => formatCurrency(value as number)}
          />}
        />
        <Legend content={<ChartLegendContent />} />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
        <Bar dataKey="Faturamento" fill="var(--color-Faturamento)" radius={[4, 4, 0, 0]}>
          <LabelList
            position="top"
            offset={4}
            className="fill-foreground text-xs"
            formatter={formatCompactNumber}
          />
        </Bar>
        <Bar dataKey="Despesa" fill="var(--color-Despesa)" radius={[4, 4, 0, 0]}>
          <LabelList
            position="top"
            offset={4}
            className="fill-foreground text-xs"
            formatter={formatCompactNumber}
          />
        </Bar>
         <Bar dataKey="Saldo" fill="var(--color-Saldo)" radius={[4, 4, 0, 0]}>
          <LabelList
            position="top"
            offset={4}
            className="fill-foreground text-xs"
            formatter={formatCompactNumber}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
