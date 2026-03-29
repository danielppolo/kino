"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  chartType?: "piechart" | "polar";
}

export default function LabelPieChart({
  walletId,
  from,
  to,
  type,
  title = "Label Distribution",
  chartType = "piechart",
}: LabelPieChartProps) {
  const [isListOpen, setIsListOpen] = useState(false);
  const [activePolarItem, setActivePolarItem] = useState<string | null>(null);
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

  type TransformedPieItem = {
    name: string;
    value: number;
    color: string;
    transactionCount: number;
    share: number;
    fill: string;
  };
  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return [] as TransformedPieItem[];

    const dataWithAmounts = data.map((item) => {
      const amount_cents =
        type === "income" ? item.income_cents : Math.abs(item.outcome_cents);

      return {
        ...item,
        amount_cents,
        label_id: item.labels?.id,
      };
    });

    const aggregated = aggregateByKeyWithCurrencyConversion(
      dataWithAmounts,
      "label_id",
      conversionRates,
      baseCurrency,
      walletMap,
    );

    const rawResult = Object.entries(aggregated).map(([, grouped]) => {
      const labelItem = grouped.items[0];
      const labelName = labelItem.labels?.name || "Unknown";
      const labelColor = labelItem.labels?.color || "#8884d8";

      return {
        name: labelName,
        value: grouped.total,
        color: labelColor,
        fill: labelColor,
        transactionCount: grouped.items.reduce(
          (sum, item) => sum + (item.transaction_count || 0),
          0,
        ),
      };
    });

    rawResult.sort((a, b) => b.value - a.value);
    const total = rawResult.reduce((sum, item) => sum + item.value, 0);

    return rawResult.map((item) => ({
      ...item,
      share: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }, [baseCurrency, conversionRates, data, type, walletMap]);

  // Create chart config for the interactive chart
  const config: ChartConfig = {};

  transformedData.forEach((item) => {
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
  const polarMaxValue = Math.max(...transformedData.map((item) => item.share), 1);
  const activeItem =
    transformedData.find((item) => item.name === activePolarItem) ?? null;

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
          {chartType === "polar" ? (
            <div className="relative flex h-full items-center justify-center">
              <svg
                viewBox="0 0 320 320"
                className="h-full w-full max-w-[340px]"
                role="img"
                aria-label={`${title} polar area chart`}
              >
                {[0.25, 0.5, 0.75, 1].map((ring) => {
                  const radius = 120 * ring;
                  return (
                    <circle
                      key={ring}
                      cx="160"
                      cy="160"
                      r={radius}
                      fill="none"
                      stroke="hsl(var(--border) / 0.5)"
                      strokeDasharray={ring === 1 ? undefined : "4 4"}
                    />
                  );
                })}
                {transformedData.map((item, index) => {
                  const sliceAngle = (Math.PI * 2) / transformedData.length;
                  const startAngle = -Math.PI / 2 + sliceAngle * index;
                  const endAngle = startAngle + sliceAngle;
                  const radius = Math.max(
                    24,
                    (item.share / polarMaxValue) * 120,
                  );
                  const x1 = 160 + radius * Math.cos(startAngle);
                  const y1 = 160 + radius * Math.sin(startAngle);
                  const x2 = 160 + radius * Math.cos(endAngle);
                  const y2 = 160 + radius * Math.sin(endAngle);
                  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
                  const path = [
                    `M 160 160`,
                    `L ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    "Z",
                  ].join(" ");

                  return (
                    <path
                      key={item.name}
                      d={path}
                      fill={item.color}
                      fillOpacity={activeItem?.name === item.name ? 0.9 : 0.55}
                      stroke={item.color}
                      strokeWidth={activeItem?.name === item.name ? 2 : 1}
                      onMouseEnter={() => setActivePolarItem(item.name)}
                      onMouseLeave={() => setActivePolarItem(null)}
                    />
                  );
                })}
              </svg>
              {activeItem && (
                <div className="bg-background absolute right-2 bottom-2 rounded-lg border p-2 shadow-sm">
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: activeItem.color }}
                      />
                      <span className="text-sm font-medium">
                        {activeItem.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>Share:</span>
                        <span>{activeItem.share.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Amount:</span>
                        <Money
                          cents={activeItem.value}
                          currency={baseCurrency}
                        />
                      </div>
                      <div>Transactions: {activeItem.transactionCount}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <PieChart>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;

                  const item = payload[0].payload as TransformedPieItem;

                  return (
                    <div className="bg-background rounded-lg border p-2 shadow-sm">
                      <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Share:</span>
                            <span>{item.share.toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Amount:</span>
                            <Money cents={item.value} currency={baseCurrency} />
                          </div>
                          <div>Transactions: {item.transactionCount}</div>
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
          )}
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Collapsible
          open={isListOpen}
          onOpenChange={setIsListOpen}
          className="w-full"
        >
          <div className="mb-3 flex items-center justify-between gap-4 text-sm">
            <div className="text-muted-foreground">
              Total <Money cents={total} currency={baseCurrency} /> across{" "}
              {transformedData.length} labels
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {isListOpen ? "Hide list" : "Show list"}
                <ChevronDown
                  className={`size-4 transition-transform ${isListOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="grid gap-2">
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
                  <span className="text-muted-foreground">
                    {item.share.toFixed(1)}%
                  </span>
                  <Money cents={item.value} currency={baseCurrency} />
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardFooter>
    </Card>
  );
}
