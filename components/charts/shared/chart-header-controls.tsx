"use client";

import { useEffect, useState } from "react";
import { BanknoteArrowUp, BanknoteX } from "lucide-react";

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

function formatForecastHorizonTriggerValue(value: number) {
  return `${value}y`;
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipButton
            variant="ghost"
            size="sm"
            tooltip="Forecast years"
            className="gap-1.5"
          >
            <span className="min-w-8 text-xs font-medium tabular-nums">
              {formatForecastHorizonTriggerValue(controls.forecastHorizonYears)}
            </span>
          </TooltipButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>Forecast years</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={String(controls.forecastHorizonYears)}
            onValueChange={(value) =>
              controls.setForecastHorizonYears(Number(value))
            }
          >
            {[1, 2, 3].map((years) => (
              <DropdownMenuRadioItem key={years} value={String(years)}>
                {years} year{years > 1 ? "s" : ""}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipButton
            variant="ghost"
            size="sm"
            tooltip="Future lump sum"
            className="gap-1.5"
          >
            <span className="text-xs font-medium tabular-nums">
              {controls.futureLumpSum > 0
                ? `+${formatCurrency(controls.futureLumpSum, baseCurrency)}`
                : "+0"}
            </span>
          </TooltipButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-0">
          <DropdownMenuLabel>Future lump sum</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="space-y-3 p-3">
            <div className="text-muted-foreground text-xs">
              Add a one-time amount to the final forecast month to see where the
              projection lands.
            </div>
            <Input
              type="number"
              min="0"
              step="100"
              value={futureLumpSumInput}
              onChange={(event) =>
                handleFutureLumpSumChange(event.target.value)
              }
              placeholder="0"
              className="h-8 text-xs"
            />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-xs font-medium">
                Applied amount
              </span>
              <span className="text-sm font-medium tabular-nums">
                <Money
                  cents={Math.round(controls.futureLumpSum * 100)}
                  currency={baseCurrency}
                />
              </span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {showAutonomyControls && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipButton variant="ghost" size="sm" tooltip="Monthly spend">
                <span className="min-w-10 text-xs font-medium tabular-nums">
                  {formatForecastSpendModeLabel(controls.forecastSpendMode)}{" "}
                  {formatSpendTriggerValue(effectiveMonthlySpend)}
                </span>
              </TooltipButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-0">
              <DropdownMenuLabel>Forecast monthly spend</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-3 p-3">
                <div className="space-y-2">
                  <span className="text-muted-foreground text-xs font-medium">
                    Spend source
                  </span>
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
                      <SelectItem
                        value="historical-average"
                        className="text-xs"
                      >
                        Historical spend average
                      </SelectItem>
                      <SelectItem value="custom" className="text-xs">
                        Custom monthly amount
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-xs font-medium">
                    Current value
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    <Money
                      cents={Math.round(effectiveMonthlySpend * 100)}
                      currency={baseCurrency}
                    />
                  </span>
                </div>
                {controls.forecastSpendMode === "required-spend" && (
                  <div className="text-muted-foreground text-xs">
                    Uses the trimmed monthly average of atemporal
                    `required_spend_kind` expenses.
                  </div>
                )}
                {controls.forecastSpendMode === "historical-average" && (
                  <div className="text-muted-foreground text-xs">
                    Uses the trimmed monthly average of total spending over the
                    selected history.
                  </div>
                )}
                {controls.forecastSpendMode === "custom" && (
                  <>
                    <Slider
                      min={0}
                      max={100000}
                      step={10000}
                      value={[
                        Math.max(
                          0,
                          Math.min(100000, controls.monthlySpend ?? 0),
                        ),
                      ]}
                      onValueChange={([value]) => controls.setMonthlySpend(value)}
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>{formatCurrency(0, baseCurrency)}</span>
                      <span>{formatCurrency(100000, baseCurrency)}</span>
                    </div>
                  </>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipButton
                variant="ghost"
                size="sm"
                tooltip="Peak normalization"
              >
                <NormalizationLevelIcon level={controls.peakNormalization} />
              </TooltipButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-0">
              <DropdownMenuLabel>Peak normalization</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-3 p-3">
                <div className="text-muted-foreground text-xs">
                  Compress isolated peaks to make the underlying trend easier to
                  read.
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
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {showFireControls && (
        <>
          {/* Withdrawal Rate */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipButton variant="ghost" size="sm" tooltip="Withdrawal rate (WR)">
                <span className="min-w-10 text-xs font-medium tabular-nums">
                  WR {((controls.selectedWR ?? 0.035) * 100).toFixed(1)}%
                </span>
              </TooltipButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0">
              <DropdownMenuLabel>Withdrawal Rate</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-3 p-3">
                <div className="text-muted-foreground text-xs">
                  Annual % drawn from your portfolio. 3.0%–3.5% recommended for
                  long (40–50y) horizons.
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
                  <span className="font-medium">
                    {((controls.selectedWR ?? 0.035) * 100).toFixed(1)}%
                  </span>
                  <span>5.0%</span>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Real Return */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipButton variant="ghost" size="sm" tooltip="Assumed real return">
                <span className="min-w-10 text-xs font-medium tabular-nums">
                  r {((controls.assumedRealReturn ?? 0.04) * 100).toFixed(0)}%
                </span>
              </TooltipButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0">
              <DropdownMenuLabel>Assumed Real Return</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-3 p-3">
                <div className="text-muted-foreground text-xs">
                  Annual portfolio real return (after inflation). 4% is a
                  common planning assumption for a globally diversified
                  portfolio.
                </div>
                <Slider
                  min={2}
                  max={8}
                  step={1}
                  value={[Math.round((controls.assumedRealReturn ?? 0.04) * 100)]}
                  onValueChange={([v]) => controls.setAssumedRealReturn(v / 100)}
                />
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>2%</span>
                  <span className="font-medium">
                    {((controls.assumedRealReturn ?? 0.04) * 100).toFixed(0)}%
                  </span>
                  <span>8%</span>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Portfolio Layers */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipButton variant="ghost" size="sm" tooltip="Portfolio layer targets">
                <span className="min-w-8 text-xs font-medium tabular-nums">
                  L{controls.liquidityMonths ?? 12}m
                </span>
              </TooltipButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-0">
              <DropdownMenuLabel>Portfolio Layer Targets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-4 p-3">
                <div className="space-y-2">
                  <span className="text-xs font-medium">
                    Liquidity runway:{" "}
                    <strong>{controls.liquidityMonths ?? 12} months</strong>
                  </span>
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
                <div className="space-y-2">
                  <span className="text-xs font-medium">
                    Inflation defense:{" "}
                    <strong>
                      {((controls.inflationDefensePct ?? 0.3) * 100).toFixed(
                        0,
                      )}
                      %
                    </strong>{" "}
                    of portfolio
                  </span>
                  <Slider
                    min={10}
                    max={50}
                    step={5}
                    value={[
                      Math.round(
                        (controls.inflationDefensePct ?? 0.3) * 100,
                      ),
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
                <div className="space-y-2">
                  <span className="text-xs font-medium">
                    FX / USD exposure:{" "}
                    <strong>
                      {((controls.fxExposurePct ?? 0.5) * 100).toFixed(0)}%
                    </strong>{" "}
                    of portfolio
                  </span>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
