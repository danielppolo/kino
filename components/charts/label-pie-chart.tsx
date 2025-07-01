"use client";

import { Pie, PieChart } from "recharts";
import { Cell } from "recharts";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createClient } from "@/utils/supabase/client";
import { getLabelPieChartData } from "@/utils/supabase/queries";
import { Money } from "@/components/ui/money";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { aggregateByKeyWithCurrencyConversion } from "@/utils/currency-conversion";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Title } from "../ui/typography";

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
  const [, walletMap] = useWallets();

  const { data, isLoading, error } = useQuery({
    queryKey: ["label-pie-chart", walletId, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getLabelPieChartData(supabase, {
        walletId,
        from,
        to,
        type,
      });

      if (error) throw error;
      return data;
    },
  });

  // Transform data with currency conversion
  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return [];

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

    console.log(aggregated);

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
    return result;
  }, [data, type, conversionRates, baseCurrency, walletMap]);

  // Create chart config for the interactive chart
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};

    transformedData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: item.color,
      };
    });

    return config;
  }, [transformedData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        Error loading chart data
      </div>
    );
  }

  if (!transformedData || transformedData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No data available for this period
      </div>
    );
  }

  const total = transformedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px]"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-background rounded-lg border p-2 shadow-sm">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">{data.name}</p>
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-sm">
                          Amount:
                        </span>
                        <Money
                          cents={data.value}
                          currency={baseCurrency}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-sm">
                          Transactions:
                        </span>
                        <span className="text-sm">{data.transactionCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Pie data={transformedData} dataKey="value" nameKey="name" stroke="0">
            {transformedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                fillOpacity={0.5}
                stroke={entry.color}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-4 text-sm text-gray-600">
        Total: <Money cents={total} currency={baseCurrency} /> |{" "}
        {transformedData.length} labels
      </div>
    </div>
  );
}
