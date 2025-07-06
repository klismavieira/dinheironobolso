"use client"

import * as React from "react"
import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

export interface PieChartData {
  category: string
  total: number
  fill: string
}

interface CategoryPieChartProps {
  data: PieChartData[]
  title: string
  description: string
  type: 'income' | 'expense'
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CategoryPieChart({ data, title, description, type }: CategoryPieChartProps) {
  const chartConfig = React.useMemo(() => {
    return data.reduce((acc, item) => {
      acc[item.category] = {
        label: item.category,
        color: item.fill,
      }
      return acc
    }, {} as ChartConfig)
  }, [data])

  const totalValue = React.useMemo(() => {
    return data.reduce((acc, item) => acc + item.total, 0)
  }, [data])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className={cn(
            "mx-auto aspect-square",
            type === 'income' ? 'max-h-[250px]' : 'max-h-[200px]'
          )}
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                hideLabel 
                formatter={(value, name) => [formatCurrency(value as number), name]}
              />}
            />
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={type === 'income' ? 60 : 50}
              strokeWidth={5}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <div className="flex-1 p-6 pt-4 flex flex-col justify-end">
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {data
            .map((item) => {
            const percentage = totalValue > 0 ? ((item.total / totalValue) * 100).toFixed(1) : "0.0";
            return (
              <li
                key={item.category}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span>{item.category}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.total)} ({percentage}%)</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}
