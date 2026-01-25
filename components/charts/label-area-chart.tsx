"use client";

import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useQuery } from "@tanstack/react-query";

import Color from "../shared/color";
import { TransactionLink } from "../shared/transaction-link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Money } from "@/components/ui/money";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyLabelStats } from "@/utils/supabase/queries";

interface LabelAreaChartProps {
  walletId?: string;
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
  // Generate all months between from and to dates in YYYY-MM-01 format
  const allMonths = new Set<string>();
  if (from && to) {
    const startDate = new Date(from);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setDate(1);
    endDate.setHours(0, 0, 0, 0);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Format as YYYY-MM-01
      const monthKey = format(currentDate, "yyyy-MM-01");
      allMonths.add(monthKey);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  let chartData = [];
  if (!data || data.length === 0) {
    // If no data but we have a date range, create empty chart data
    if (from && to && allMonths.size > 0) {
      const emptyChartData = Array.from(allMonths).map((month) => ({
        month: month as string,
        empty: 0, // Add empty field for chart structure
      }));
      chartData = emptyChartData.sort((a, b) => a.month.localeCompare(b.month));
    }
  } else {
    // First pass: collect all unique labels and months, and aggregate values
    const labels = new Map();
    const months = new Set<string>();
    const aggregatedData = new Map(); // Map<`${month}|${labelId}`, aggregatedValue>

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

      // Aggregate values for the same month and label
      const value =
        type === "income"
          ? item.income_cents
          : type === "expense"
            ? Math.abs(item.outcome_cents)
            : Math.abs(item.net_cents);

      const key = `${month}|${labelId}`;
      const existingValue = aggregatedData.get(key) || 0;
      aggregatedData.set(key, existingValue + value);
    });

    // If no date range specified, use only months with data
    if (!from || !to) {
      months.forEach((month) => allMonths.add(month));
    }

    // Second pass: create month entries with all labels initialized to 0
    const monthlyData = new Map();
    const labelSafeKeys = Array.from(labels.values()).map(
      (label) => label.safeKey,
    );
    allMonths.forEach((month) => {
      const monthEntry: { month: string; [key: string]: number | string } = {
        month,
        empty: 0, // Add empty field for chart structure
      };

      // Initialize all labels to 0
      labelSafeKeys.forEach((safeKey) => {
        monthEntry[safeKey] = 0;
      });

      monthlyData.set(month, monthEntry);
    });

    // Third pass: populate aggregated values
    aggregatedData.forEach((value, key) => {
      const [month, labelId] = key.split("|");
      const label = labels.get(labelId);

      if (label && monthlyData.has(month)) {
        const monthEntry = monthlyData.get(month);
        monthEntry[label.safeKey] = value;
      }
    });

    // Convert to array and sort by month
    chartData = Array.from(monthlyData.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }

  // Create chart config from labels (reuse the labels from chartData transformation)
  const config: ChartConfig = {};

  if (data && data.length > 0) {
    // Collect unique labels (same logic as in chartData)
    const labels = new Map();
    data.forEach((item) => {
      const labelId = item.labels?.id;
      const labelName = item.labels?.name || "Unknown";
      const labelColor = item.labels?.color || "#8884d8";
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

  const chartConfig = config;

  // Calculate aggregated totals by label
  const totals: Array<{
    name: string;
    total: number;
    color: string;
    safeKey: string;
    id: string;
  }> = [];

  if (data && data.length > 0) {
    // Collect unique labels and their totals
    const labelMap = new Map();

    data.forEach((item) => {
      const labelId = item.labels?.id;
      const labelName = item.labels?.name || "Unknown";
      const labelColor = item.labels?.color || "#8884d8";
      const safeKey = labelName.replace(/[^a-zA-Z0-9]/g, "_");

      const value =
        type === "income"
          ? item.income_cents
          : type === "expense"
            ? Math.abs(item.outcome_cents)
            : Math.abs(item.net_cents);

      if (!labelMap.has(labelId)) {
        labelMap.set(labelId, {
          name: labelName,
          total: 0,
          color: labelColor,
          safeKey: safeKey,
          id: labelId,
        });
      }

      labelMap.get(labelId).total += value;
    });

    // Convert to array and sort by total (descending)
    totals.push(...Array.from(labelMap.values()));
    totals.sort((a, b) => b.total - a.total);
  }

  const labelTotals = totals;

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
        .filter((key) => key !== "month" && key !== "empty")
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
          {walletId ? " for this wallet" : " across all wallets"}
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
                            className="text-muted-foreground flex items-center justify-between gap-2"
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
                            <Money
                              cents={Number(entry.value) || 0}
                              className="text-sm"
                            />
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
                type="step"
                fill={`var(--color-${safeKey})`}
                fillOpacity={0.4}
                stroke={`var(--color-${safeKey})`}
                stackId="a"
              />
            ))}
            {/* Always render empty area for chart structure */}
            <Area
              dataKey="empty"
              type="step"
              fill="transparent"
              stroke="transparent"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-col gap-3 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">
            Total: <Money cents={total} /> | {labelCount} labels
          </div>

          {labelTotals.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="label-totals" className="border-none">
                <AccordionTrigger className="text-muted-foreground py-2 text-xs font-medium tracking-wide uppercase hover:no-underline">
                  Aggregated by Label
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-1">
                    {labelTotals.map((label) => (
                      <TransactionLink
                        key={label.safeKey}
                        walletId={walletId}
                        labelId={label.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Color color={label.color} size="sm" />
                          <span className="text-sm">{label.name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          <Money cents={label.total} />
                        </span>
                      </TransactionLink>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <div className="text-muted-foreground flex items-center gap-2 leading-none">
            {from && to ? `${from} - ${to}` : "All time"}
            {walletId ? "" : " | All wallets"}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
