"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";
import { getCategoryPieChartData } from "@/utils/supabase/queries";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { aggregateByKeyWithCurrencyConversion } from "@/utils/currency-conversion";
import { Money } from "@/components/ui/money";

interface CategoryPieChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  type: "income" | "expense" | "net";
  title?: string;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
];

export default function CategoryPieChart({
  walletId,
  from,
  to,
  type,
  title = "Category Distribution",
}: CategoryPieChartProps) {
  const { conversionRates, baseCurrency } = useCurrency();
  const [wallets, walletMap] = useWallets();
  const workspaceWalletIds = wallets.map((w) => w.id);

  const { data, isLoading, error } = useQuery({
    queryKey: ["category-pie-chart", walletId, workspaceWalletIds, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getCategoryPieChartData(supabase, {
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
  type TransformedPieItem = {
    name: string;
    value: number;
    color: string;
    icon?: string;
    transactionCount: number;
  };
  let transformedData: TransformedPieItem[] = [];
  if (data && data.length > 0) {
    // Convert the data to the format expected by the aggregation function
    const dataWithAmounts = data.map((item) => {
      const amount_cents =
        type === "income"
          ? item.income_cents
          : type === "expense"
            ? Math.abs(item.outcome_cents)
            : Math.abs(item.net_cents);

      return {
        ...item,
        amount_cents,
        category_id: item.categories?.id,
      };
    });

    // Aggregate by category with currency conversion
    const aggregated = aggregateByKeyWithCurrencyConversion(
      dataWithAmounts,
      "category_id",
      conversionRates,
      baseCurrency,
      walletMap,
    );

    // Transform to pie chart format
    const result = Object.entries(aggregated).map(
      ([categoryId, data], index) => {
        const categoryItem = data.items[0]; // Get category info from first item
        const categoryName = categoryItem.categories?.name || "Unknown";

        return {
          name: categoryName,
          value: data.total,
          color: COLORS[index % COLORS.length],
          icon: categoryItem.categories?.icon,
          transactionCount: data.items.reduce(
            (sum, item) => sum + (item.transaction_count || 0),
            0,
          ),
        };
      },
    );

    result.sort((a, b) => b.value - a.value);
    transformedData = result;
  }

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
    <div className="h-64 w-full">
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={transformedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {transformedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
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
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600">
        Total: <Money cents={total} currency={baseCurrency} /> |{" "}
        {transformedData.length} categories
      </div>
    </div>
  );
}
