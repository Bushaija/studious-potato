"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

interface BudgetItem {
  id: number;
  name: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

interface BudgetBarChartProps {
  data: BudgetItem[];
  title: string;
  entityType: "district" | "facility";
}

export function BudgetBarChart({ data, title, entityType }: BudgetBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">
            No {entityType} budget data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sort data by allocated budget descending
  const sortedData = [...data].sort((a, b) => b.allocatedBudget - a.allocatedBudget);

  // Transform data for recharts
  const chartData = sortedData.map((item) => ({
    name: item.name,
    allocated: item.allocatedBudget,
    spent: item.spentBudget,
    utilization: item.utilizationPercentage,
  }));

  const chartConfig: ChartConfig = {
    allocated: {
      label: "Allocated Budget",
      color: "var(--chart-1)",
    },
    spent: {
      label: "Spent Budget",
      color: "var(--chart-2)",
    },
  };

  return (
    <Card className="w-full h-[350px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            barGap={0}
            barCategoryGap="10%"
            margin={{ top: 0, right: 0, left: 20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name, item) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="capitalize">{name}:</span>
                        <span className="font-bold">{formatCurrency(Number(value))}</span>
                      </div>
                      {name === "spent" && (
                        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                          <span>Utilization:</span>
                          <span>{item.payload.utilization.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="allocated"
              stackId="a"
              fill="var(--color-allocated)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="spent"
              stackId="a"
              fill="var(--color-spent)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}