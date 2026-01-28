"use client";

import React from "react";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { formatCurrency, parseMonthDate } from "@/utils/chart-helpers";
import { StackOffsetToggle } from "./stack-offset-toggle";

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

interface DataItem {
  id: string;
  name: string;
  color?: string;
}

interface StackedTrendsChartProps {
  chartData: ChartDataPoint[];
  chartConfig: ChartConfig;
  dataItems: DataItem[];
  title: string;
  description: string;
  baseCurrency: string;
  isLoading?: boolean;
  error?: Error | null;
  footer?: React.ReactNode;
  showOutlierWarning?: boolean;
}

export function StackedTrendsChart({
  chartData,
  chartConfig,
  dataItems,
  title,
  description,
  baseCurrency,
  isLoading = false,
  error = null,
  footer,
  showOutlierWarning = false,
}: StackedTrendsChartProps) {
  const [stackMode, setStackMode] = React.useState<"percentage" | "absolute">(
    "percentage"
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col space-y-1.5">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <StackOffsetToggle value={stackMode} onValueChange={setStackMode} />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
            stackOffset={stackMode === "percentage" ? "expand" : undefined}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(parseMonthDate(value), "MMM yyyy")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                stackMode === "percentage"
                  ? `${(value * 100).toFixed(0)}%`
                  : formatCurrency(value, baseCurrency)
              }
              domain={[0, "auto"]}
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(parseMonthDate(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                // Get original uncapped values if they exist
                const dataPoint = chartData.find((d) => d.month === label);
                const originalValues = (dataPoint as any)?._original || {};

                // Sort and filter payload
                const sortedPayload = [...payload]
                  .filter((entry) => Number(entry.value) > 0)
                  .sort((a, b) => {
                    const valueA = Number(a.value) || 0;
                    const valueB = Number(b.value) || 0;
                    return valueB - valueA;
                  });

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(parseMonthDate(label), "MMMM yyyy")}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        {sortedPayload.map((item) => {
                          const dataItem = dataItems.find(
                            (d) => d.id === item.dataKey
                          );
                          if (!dataItem) return null;

                          // Check for original uncapped value
                          const originalAmount =
                            originalValues[item.dataKey as string] ?? item.value;
                          const displayedAmount = item.value as number;
                          const isCapped = showOutlierWarning && originalAmount > displayedAmount;

                          return (
                            <div
                              key={item.dataKey}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm">{dataItem.name}</span>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <Money
                                  cents={Math.round((Number(originalAmount) || 0) * 100)}
                                  currency={baseCurrency}
                                />
                                {isCapped && (
                                  <span className="text-muted-foreground text-xs">
                                    (chart shows {formatCurrency(displayedAmount, baseCurrency)})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {dataItems.map((item) => (
              <Bar
                key={item.id}
                dataKey={item.id}
                name={item.name}
                fill={chartConfig[item.id]?.color || item.color}
                stackId="stack"
                radius={[0, 0, 0, 0]}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
