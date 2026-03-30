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
    </div>
  );
}
