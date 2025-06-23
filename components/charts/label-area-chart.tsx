"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useQuery } from "@tanstack/react-query";

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
  ChartTooltip,
} from "@/components/ui/chart";
import { formatCents } from "@/utils/format-cents";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyLabelStats } from "@/utils/supabase/queries";

interface LabelAreaChartProps {
  walletId: string;
  from?: string;
  to?: string;
  type: "income" | "expense" | "net";
  title?: string;
}

export default function LabelAreaChart({
  walletId,
  from,
  to,
  type,
  title = "Label Trends",
}: LabelAreaChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["label-area-chart", walletId, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyLabelStats(supabase, {
        walletId,
        from,
        to,
        type,
      });

      if (error) throw error;
      return data;
    },
  });

  // Transform data for area chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // First pass: collect all unique labels and months
    const labels = new Map();
    const months = new Set();

    data.forEach((item) => {
      const month = item.month;
      const labelId = item.labels?.id;
      const labelName = item.labels?.name || "Unknown";
      const labelColor = item.labels?.color || "#8884d8";

      // Create safe key for CSS variables (replace spaces and special chars with underscores)
      const safeKey = labelName.replace(/[^a-zA-Z0-9]/g, "_");

      // Store label info
      if (!labels.has(labelId)) {
        labels.set(labelId, {
          id: labelId,
          name: labelName,
          safeKey: safeKey,
          color: labelColor,
        });
      }

      months.add(month);
    });

    // Second pass: create month entries with all labels initialized to 0
    const monthlyData = new Map();
    const labelSafeKeys = Array.from(labels.values()).map(
      (label) => label.safeKey,
    );

    months.forEach((month) => {
      const monthEntry: { month: string; [key: string]: number | string } = {
        month: month as string,
      };

      // Initialize all labels to 0
      labelSafeKeys.forEach((safeKey) => {
        monthEntry[safeKey] = 0;
      });

      monthlyData.set(month, monthEntry);
    });

    // Third pass: populate actual values
    data.forEach((item) => {
      const month = item.month;
      const labelName = item.labels?.name || "Unknown";
      const safeKey = labelName.replace(/[^a-zA-Z0-9]/g, "_");

      const monthEntry = monthlyData.get(month);
      if (monthEntry) {
        const value =
          type === "income"
            ? item.income_cents
            : type === "expense"
              ? Math.abs(item.outcome_cents)
              : Math.abs(item.net_cents);

        monthEntry[safeKey] = value;
      }
    });

    // Convert to array and sort by month
    return Array.from(monthlyData.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }, [data, type]);

  // Create chart config from labels
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};

    if (data) {
      const labels = new Map();
      data.forEach((item) => {
        const labelId = item.labels?.id;
        const labelName = item.labels?.name || "Unknown";
        const labelColor = item.labels?.color || "#8884d8";

        // Create safe key for CSS variables
        const safeKey = labelName.replace(/[^a-zA-Z0-9]/g, "_");

        if (!labels.has(labelId)) {
          labels.set(labelId, {
            id: labelId,
            name: labelName,
            safeKey: safeKey,
            color: labelColor,
          });
        }
      });

      // Reverse the order of labels for proper stacking
      Array.from(labels.values())
        .reverse()
        .forEach((label) => {
          config[label.safeKey] = {
            label: label.name,
            color: label.color,
          };
        });
    }

    return config;
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total for footer
  const total = chartData.reduce((sum, month) => {
    return (
      sum +
      Object.keys(month)
        .filter((key) => key !== "month")
        .reduce((monthSum, label) => monthSum + (month[label] || 0), 0)
    );
  }, 0);

  const labelCount = Object.keys(chartConfig).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Showing {type} trends by label over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
            }}
            stackOffset="expand"
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                });
              }}
            />
            <ChartTooltip
              reverseDirection={{
                y: true,
                x: true,
              }}
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) {
                  return null;
                }

                // Sort payload by value in descending order and filter out zero values
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
                      <p className="text-sm font-medium">
                        {new Date(label).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <div className="grid gap-1">
                        {sortedPayload.map((entry) => (
                          <div
                            key={entry.dataKey}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm font-medium">
                                {entry.name}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-sm">
                              {formatCents(Number(entry.value) || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {Object.keys(chartConfig).map((safeKey) => (
              <Area
                key={safeKey}
                dataKey={safeKey}
                type="monotone"
                fill={`var(--color-${safeKey})`}
                fillOpacity={0.4}
                stroke={`var(--color-${safeKey})`}
                stackId="a"
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Total: ${(total / 100).toFixed(2)} | {labelCount} labels
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              {from && to ? `${from} - ${to}` : "All time"}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
