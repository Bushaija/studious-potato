"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Pie, PieChart } from "recharts";

interface ProgramDistributionItem {
  programId: number;
  programName: string;
  allocatedBudget: number;
  percentage: number;
}

interface ProgramDistributionChartProps {
  data: ProgramDistributionItem[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ProgramDistributionChart({ data }: ProgramDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Budget Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">
            No program distribution data available
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

  // Transform data for recharts with fill property
  const chartData = data.map((item, index) => ({
    programName: item.programName,
    allocatedBudget: item.allocatedBudget,
    percentage: item.percentage,
    fill: COLORS[index % COLORS.length],
  }));

  // Create chart config dynamically based on your data
  const chartConfig: ChartConfig = data.reduce((acc, item, index) => {
    const key = item.programName.toLowerCase().replace(/\s+/g, '-');
    acc[key] = {
      label: item.programName,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {
    allocatedBudget: {
      label: "Budget",
    },
  } as ChartConfig);

  return (
  <Card className="flex flex-col h-full">
    <CardHeader className="items-center pb-0">
      <CardTitle>Program Budget Distribution</CardTitle>
    </CardHeader>
    <CardContent className="flex-1 pb-0">
      <ChartContainer
        config={chartConfig}
        className="mx-auto h-[250px] w-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <div className="flex items-center justify-between gap-4">
                    <span>{name}</span>
                    <span className="font-bold">{formatCurrency(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="allocatedBudget"
            nameKey="programName"
            innerRadius={60}
            strokeWidth={5}
            label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
          />
        </PieChart>
      </ChartContainer>
    </CardContent>
  </Card>
);
}