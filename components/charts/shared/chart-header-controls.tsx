"use client";

import { useEffect, useState } from "react";
import { BanknoteArrowUp, BanknoteX, SlidersHorizontal } from "lucide-react";

import { useChartControls } from "./chart-controls-context";
import { NormalizationLevelIcon } from "./chart-normalization-toggle";
import { StackOffsetToggle } from "./stack-offset-toggle";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useCurrency } from "@/contexts/settings-context";
import {
  CHART_NORMALIZATION_PRESETS,
  ChartNormalizationPreset,
  formatCurrency,
} from "@/utils/chart-helpers";

interface ChartHeaderControlsProps {
  showAutonomyControls?: boolean;
  showFireControls?: boolean;
}

function formatSpendTriggerValue(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return `${value}`;
}

function formatForecastSpendModeLabel(
  value: "required-spend" | "historical-average" | "custom",
) {
  switch (value) {
    case "required-spend":
      return "Req";
    case "custom":
      return "Custom";
    case "historical-average":
    default:
      return "Avg";
  }
}

export function ChartHeaderControls({
  showAutonomyControls = false,
  showFireControls = false,
}: ChartHeaderControlsProps) {
  const controls = useChartControls();
  const { baseCurrency } = useCurrency();
  const [futureLumpSumInput, setFutureLumpSumInput] = useState("");

  useEffect(() => {
    setFutureLumpSumInput(
      controls?.futureLumpSum ? String(controls.futureLumpSum) : "",
    );
  }, [controls?.futureLumpSum]);

  if (!controls) {
    return null;
  }

  const effectiveMonthlySpend = controls.effectiveMonthlySpend;

  const handleFutureLumpSumChange = (value: string) => {
    setFutureLumpSumInput(value);
    if (value.trim() === "") {
      controls.setFutureLumpSum(0);
      return;
    }
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      controls.setFutureLumpSum(Math.max(0, parsed));
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StackOffsetToggle
        value={controls.chartValueMode}
        onValueChange={controls.setChartValueMode}
      />

      {showAutonomyControls && (
        <Toggle
          size="sm"
          variant="outline"
          pressed={controls.forecastMode === "no-income"}
          onPressedChange={(pressed) =>
            controls.setForecastMode(pressed ? "no-income" : "with-income")
          }
          aria-label={
            controls.forecastMode === "no-income"
              ? "No income forecast"
              : "With income forecast"
          }
          className="px-2"
        >
          {controls.forecastMode === "no-income" ? (
            <BanknoteX className="size-4" />
          ) : (
            <BanknoteArrowUp className="size-4" />
          )}
        </Toggle>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipButton variant="ghost" size="sm" tooltip="Chart settings">
            <SlidersHorizontal className="size-4" />
          </TooltipButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-0">

          {/* ── Forecast ── */}
          <DropdownMenuLabel>Forecast</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="space-y-3 p-3">
            {/* Forecast horizon */}
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Horizon
              </span>
              <DropdownMenuRadioGroup
                value={String(controls.forecastHorizonYears)}
                onValueChange={(value) =>
                  controls.setForecastHorizonYears(Number(value))
                }
              >
                <div className="flex gap-1">
                  {[1, 2, 3].map((years) => (
                    <DropdownMenuRadioItem
                      key={years}
                      value={String(years)}
                      className="flex-1 justify-center text-xs"
                    >
                      {years}y
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              </DropdownMenuRadioGroup>
            </div>

            {/* Future lump sum */}
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Future lump sum
              </span>
              <Input
                type="number"
                min="0"
                step="100"
                value={futureLumpSumInput}
                onChange={(e) => handleFutureLumpSumChange(e.target.value)}
                placeholder="0"
                className="h-8 text-xs"
              />
              {controls.futureLumpSum > 0 && (
                <div className="text-muted-foreground flex justify-end text-xs">
                  <Money
                    cents={Math.round(controls.futureLumpSum * 100)}
                    currency={baseCurrency}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Autonomy ── */}
          {showAutonomyControls && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Autonomy</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="space-y-3 p-3">
                {/* Monthly spend */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Monthly spend
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {formatForecastSpendModeLabel(controls.forecastSpendMode)}{" "}
                      {formatSpendTriggerValue(effectiveMonthlySpend)}
                    </span>
                  </div>
                  <Select
                    value={controls.forecastSpendMode}
                    onValueChange={(value) =>
                      controls.setForecastSpendMode(
                        value as
                          | "required-spend"
                          | "historical-average"
                          | "custom",
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required-spend" className="text-xs">
                        Required spend average
                      </SelectItem>
                      <SelectItem value="historical-average" className="text-xs">
                        Historical spend average
                      </SelectItem>
                      <SelectItem value="custom" className="text-xs">
                        Custom monthly amount
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {controls.forecastSpendMode === "custom" && (
                    <>
                      <Slider
                        min={0}
                        max={100000}
                        step={10000}
                        value={[
                          Math.max(0, Math.min(100000, controls.monthlySpend ?? 0)),
                        ]}
                        onValueChange={([value]) =>
                          controls.setMonthlySpend(value)
                        }
                      />
                      <div className="text-muted-foreground flex justify-between text-xs">
                        <span>{formatCurrency(0, baseCurrency)}</span>
                        <span>{formatCurrency(100000, baseCurrency)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Peak normalization */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Peak normalization
                    </span>
                    <NormalizationLevelIcon level={controls.peakNormalization} />
                  </div>
                  <Select
                    value={controls.peakNormalization}
                    onValueChange={(value) =>
                      controls.setPeakNormalization(
                        value as ChartNormalizationPreset,
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(CHART_NORMALIZATION_PRESETS) as Array<
                          [
                            ChartNormalizationPreset,
                            (typeof CHART_NORMALIZATION_PRESETS)[ChartNormalizationPreset],
                          ]
                        >
                      ).map(([key, preset]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* ── FIRE ── */}
          {showFireControls && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>FIRE</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="space-y-4 p-3">
                {/* Withdrawal rate */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Withdrawal rate
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {((controls.selectedWR ?? 0.035) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Slider
                    min={20}
                    max={50}
                    step={5}
                    value={[Math.round((controls.selectedWR ?? 0.035) * 1000)]}
                    onValueChange={([v]) => controls.setSelectedWR(v / 1000)}
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>2.0%</span>
                    <span>5.0%</span>
                  </div>
                </div>

                {/* Real return */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Assumed real return
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {((controls.assumedRealReturn ?? 0.04) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={2}
                    max={8}
                    step={1}
                    value={[
                      Math.round((controls.assumedRealReturn ?? 0.04) * 100),
                    ]}
                    onValueChange={([v]) => controls.setAssumedRealReturn(v / 100)}
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>2%</span>
                    <span>8%</span>
                  </div>
                </div>

                {/* Liquidity months */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Liquidity runway
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {controls.liquidityMonths ?? 12} mo
                    </span>
                  </div>
                  <Slider
                    min={6}
                    max={24}
                    step={3}
                    value={[controls.liquidityMonths ?? 12]}
                    onValueChange={([v]) => controls.setLiquidityMonths(v)}
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>6 mo</span>
                    <span>24 mo</span>
                  </div>
                </div>

                {/* Inflation defense */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Inflation defense
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {((controls.inflationDefensePct ?? 0.3) * 100).toFixed(0)}
                      % of portfolio
                    </span>
                  </div>
                  <Slider
                    min={10}
                    max={50}
                    step={5}
                    value={[
                      Math.round((controls.inflationDefensePct ?? 0.3) * 100),
                    ]}
                    onValueChange={([v]) =>
                      controls.setInflationDefensePct(v / 100)
                    }
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>10%</span>
                    <span>50%</span>
                  </div>
                </div>

                {/* FX exposure */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      FX / USD exposure
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {((controls.fxExposurePct ?? 0.5) * 100).toFixed(0)}% of
                      portfolio
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={80}
                    step={10}
                    value={[
                      Math.round((controls.fxExposurePct ?? 0.5) * 100),
                    ]}
                    onValueChange={([v]) => controls.setFxExposurePct(v / 100)}
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>0%</span>
                    <span>80%</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
