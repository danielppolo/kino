"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
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
import { useCurrency } from "@/contexts/settings-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { formatCurrency } from "@/utils/chart-helpers";

const chartConfig: ChartConfig = {
  liquidity: {
    label: "Liquidity Layer",
    color: "#22c55e",
  },
  inflationDefense: {
    label: "Inflation Defense",
    color: "#3b82f6",
  },
  growth: {
    label: "Growth Layer",
    color: "#8b5cf6",
  },
};

export function PortfolioLayerChart() {
  const { totalBalance } = useTotalBalance();
  const { baseCurrency } = useCurrency();
  const controls = useChartControls();
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const liquidityMonths = controls?.liquidityMonths ?? 12;
  const inflationDefensePct = controls?.inflationDefensePct ?? 0.3;

  const currentBalance = totalBalance / 100;

  const { layers, statusText } = useMemo(() => {
    const liquidityTarget = effectiveMonthlySpend * liquidityMonths;
    const liquidityFilled = Math.min(currentBalance, liquidityTarget);
    const remainingAfterLiquidity = Math.max(0, currentBalance - liquidityFilled);

    const inflationDefenseTarget = currentBalance * inflationDefensePct;
    const inflationDefenseFilled = Math.min(
      remainingAfterLiquidity,
      inflationDefenseTarget,
    );
    const growthFilled = Math.max(
      0,
      remainingAfterLiquidity - inflationDefenseFilled,
    );

    const liquidityMet = liquidityFilled >= liquidityTarget;
    const inflationDefenseMet =
      inflationDefenseFilled >= inflationDefenseTarget;

    const statusParts: string[] = [];
    if (!liquidityMet)
      statusParts.push(
        `liquidity gap: ${formatCurrency(liquidityTarget - liquidityFilled, baseCurrency)}`,
      );
    if (!inflationDefenseMet)
      statusParts.push(
        `inflation-defense gap: ${formatCurrency(inflationDefenseTarget - inflationDefenseFilled, baseCurrency)}`,
      );

    return {
      layers: [
        {
          name: "Liquidity",
          label: "Liquidity Layer",
          description: `${liquidityMonths}mo of spend`,
          target: liquidityTarget,
          filled: liquidityFilled,
          color: liquidityMet ? "#22c55e" : "#ef4444",
          met: liquidityMet,
        },
        {
          name: "Inflation Defense",
          label: "Inflation Defense",
          description: `${(inflationDefensePct * 100).toFixed(0)}% of portfolio`,
          target: inflationDefenseTarget,
          filled: inflationDefenseFilled,
          color: inflationDefenseMet ? "#3b82f6" : "#f59e0b",
          met: inflationDefenseMet,
        },
        {
          name: "Growth",
          label: "Growth Layer",
          description: "Global equities / long-term",
          target: null,
          filled: growthFilled,
          color: "#8b5cf6",
          met: true,
        },
      ],
      statusText:
        statusParts.length === 0
          ? "All layers fully funded."
          : `Gaps: ${statusParts.join("; ")}.`,
    };
  }, [currentBalance, effectiveMonthlySpend, liquidityMonths, inflationDefensePct, baseCurrency]);

  // Build stacked horizontal bar data — each layer is a row with a single bar segment
  const barData = [
    {
      name: "Portfolio",
      liquidity: layers[0].filled,
      inflationDefense: layers[1].filled,
      growth: layers[2].filled,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Layer Allocation</CardTitle>
        <CardDescription>
          Your {formatCurrency(currentBalance, baseCurrency)} portfolio mapped
          to the three FIRE layers: liquidity runway, inflation defense, and
          long-term growth. {statusText}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horizontal stacked progress bars per layer */}
        <div className="space-y-4">
          {layers.map((layer) => {
            const pct =
              currentBalance > 0
                ? Math.min(1, layer.filled / currentBalance)
                : 0;
            const targetPct =
              layer.target !== null && currentBalance > 0
                ? Math.min(1, layer.target / currentBalance)
                : null;

            return (
              <div key={layer.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="font-medium">{layer.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {layer.description}
                    </span>
                  </div>
                  <div className="tabular-nums text-right">
                    <span className="font-medium">
                      {formatCurrency(layer.filled, baseCurrency)}
                    </span>
                    {layer.target !== null && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        / {formatCurrency(layer.target, baseCurrency)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-muted relative h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(pct * 100).toFixed(2)}%`,
                      backgroundColor: layer.color,
                      opacity: 0.85,
                    }}
                  />
                  {targetPct !== null && targetPct < 1 && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-white/60"
                      style={{ left: `${(targetPct * 100).toFixed(2)}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stacked bar overview */}
        <div>
          <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Portfolio composition
          </div>
          <ChartContainer
            config={chartConfig}
            className="h-14 w-full"
          >
            <BarChart
              layout="vertical"
              data={barData}
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              barSize={28}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-background rounded-lg border p-2 shadow-sm">
                      {payload.map((p) => {
                        const layer = layers.find(
                          (l) =>
                            l.name.toLowerCase().replace(" ", "") ===
                            String(p.dataKey).replace("inflationDefense", "inflationdefense"),
                        );
                        return (
                          <div
                            key={String(p.dataKey)}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: layer?.color ?? "#888" }}
                            />
                            <span>{p.name}</span>
                            <span className="font-bold">
                              {formatCurrency(Number(p.value), baseCurrency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Bar dataKey="liquidity" stackId="a" radius={[4, 0, 0, 4]} fill={layers[0].color} fillOpacity={0.85} />
              <Bar dataKey="inflationDefense" stackId="a" fill={layers[1].color} fillOpacity={0.85} />
              <Bar dataKey="growth" stackId="a" radius={[0, 4, 4, 0]} fill={layers[2].color} fillOpacity={0.85} />
            </BarChart>
          </ChartContainer>
          <div className="mt-2 flex justify-between gap-4 text-xs">
            {layers.map((layer) => (
              <div key={layer.name} className="flex items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-muted-foreground">{layer.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
