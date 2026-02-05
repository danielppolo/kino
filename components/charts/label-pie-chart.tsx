"use client";

import { Pie, PieChart } from "recharts";
import { Cell } from "recharts";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { aggregateByKeyWithCurrencyConversion } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getLabelPieChartData } from "@/utils/supabase/queries";

interface LabelPieChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  type: "income" | "expense" | "net";
  title?: string;
}

export default function LabelPieChart({
  walletId,
  from,
  to,
  type,
  title = "Label Distribution",
}: LabelPieChartProps) {
  const { conversionRates, baseCurrency } = useCurrency();
  const [wallets, walletMap] = useWallets();
  const workspaceWalletIds = wallets.map((w) => w.id);

  const { data, isLoading, error } = useQuery({
    queryKey: ["label-pie-chart", walletId, workspaceWalletIds, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getLabelPieChartData(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
        type,
      });

      if (error) throw error;
      return data;
    },
  });

  // Transform data with currency conversion
  let transformedData = [];
  if (data && data.length > 0) {
    // Convert the data to the format expected by the aggregation function
    const dataWithAmounts = data.map((item) => {
      const amount_cents =
        type === "income" ? item.income_cents : Math.abs(item.outcome_cents);

      return {
        ...item,
        amount_cents,
        label_id: item.labels?.id,
      };
    });

    // Aggregate by label with currency conversion
    const aggregated = aggregateByKeyWithCurrencyConversion(
      dataWithAmounts,
      "label_id",
      conversionRates,
      baseCurrency,
      walletMap,
    );

    // Transform to pie chart format
    const result = Object.entries(aggregated).map(([labelId, data]) => {
      const labelItem = data.items[0]; // Get label info from first item
      const labelName = labelItem.labels?.name || "Unknown";
      const labelColor = labelItem.labels?.color || "#8884d8";

      return {
        name: labelName,
        value: data.total,
        color: labelColor,
        transactionCount: data.items.reduce(
          (sum, item) => sum + (item.transaction_count || 0),
          0,
        ),
      };
    });

    result.sort((a, b) => b.value - a.value);
    transformedData = result;
  }

  // Create chart config for the interactive chart
  const config: ChartConfig = {};

  transformedData.forEach((item, index) => {
    config[item.name] = {
      label: item.name,
      color: item.color,
    };
  });

  const chartConfig: ChartConfig = config;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Distribution of {type} by label in {baseCurrency}
          </CardDescription>
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
          <CardDescription>
            Distribution of {type} by label in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transformedData || transformedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Distribution of {type} by label in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = transformedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Distribution of {type} by label in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span className="text-sm font-medium">{data.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>Amount:</span>
                          <Money
                            cents={data.value}
                            currency={baseCurrency}
                          />
                        </div>
                        <div>Transactions: {data.transactionCount}</div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={transformedData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {transformedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 grid gap-2">
          {transformedData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{((item.value / total) * 100).toFixed(1)}%</span>
                <Money cents={item.value} currency={baseCurrency} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
