"use client";

import { BanknoteArrowUp, BanknoteX } from "lucide-react";

import { Money } from "@/components/ui/money";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { NormalizationLevelIcon } from "./chart-normalization-toggle";
import { useChartControls } from "./chart-controls-context";

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

export function ChartHeaderControls({
  showAutonomyControls = false,
}: ChartHeaderControlsProps) {
  const controls = useChartControls();
  const { baseCurrency } = useCurrency();

  if (!controls) {
    return null;
  }

  const effectiveMonthlySpend =
    controls.monthlySpend ?? controls.defaultMonthlySpend;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
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

      {showAutonomyControls && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipButton variant="ghost" size="sm" tooltip="Monthly spend">
                <span className="min-w-10 text-xs font-medium tabular-nums">
                  {formatSpendTriggerValue(effectiveMonthlySpend)}
                </span>
              </TooltipButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-0">
              <DropdownMenuLabel>Monthly spend</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-3 p-3">
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
                <Slider
                  min={0}
                  max={100000}
                  step={10000}
                  value={[Math.max(0, Math.min(100000, effectiveMonthlySpend))]}
                  onValueChange={([value]) => controls.setMonthlySpend(value)}
                />
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>{formatCurrency(0, baseCurrency)}</span>
                  <span>{formatCurrency(100000, baseCurrency)}</span>
                </div>
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
