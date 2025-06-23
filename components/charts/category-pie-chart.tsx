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

interface CategoryPieChartProps {
  walletId: string;
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["category-pie-chart", walletId, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getCategoryPieChartData(supabase, {
        walletId,
        from,
        to,
        type,
      });

      if (error) throw error;

      // Transform data for pie chart
      return (
        data?.map((item, index) => ({
          name: item.categories?.name || "Unknown",
          value:
            type === "income"
              ? item.income_cents
              : type === "expense"
                ? Math.abs(item.outcome_cents)
                : Math.abs(item.net_cents),
          color: COLORS[index % COLORS.length],
          icon: item.categories?.icon,
          transactionCount: item.transaction_count,
        })) || []
      );
    },
  });

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

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No data available for this period
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-64 w-full">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
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
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `$${(value / 100).toFixed(2)}`,
              "Amount",
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600">
        Total: ${(total / 100).toFixed(2)} | {data.length} categories
      </div>
    </div>
  );
}
