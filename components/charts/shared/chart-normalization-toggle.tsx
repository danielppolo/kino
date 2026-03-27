"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CHART_NORMALIZATION_PRESETS,
  ChartNormalizationPreset,
} from "@/utils/chart-helpers";

interface ChartNormalizationToggleProps {
  value: ChartNormalizationPreset;
  onValueChange: (value: ChartNormalizationPreset) => void;
}

function NormalizationLevelIcon({
  level,
}: {
  level: ChartNormalizationPreset;
}) {
  const capY =
    level === "light" ? 5 : level === "balanced" ? 9 : 13;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={`M3 ${capY}H17`} strokeDasharray="2 2" opacity="0.9" />
      <path d="M5 15V10" />
      <path d="M10 15V7" />
      <path d="M15 15V4" />
    </svg>
  );
}

export function ChartNormalizationToggle({
  value,
  onValueChange,
}: ChartNormalizationToggleProps) {
  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue as ChartNormalizationPreset);
          }
        }}
        size="sm"
        variant="outline"
        className="justify-start gap-0"
      >
        {(
          Object.entries(CHART_NORMALIZATION_PRESETS) as Array<
            [ChartNormalizationPreset, (typeof CHART_NORMALIZATION_PRESETS)[ChartNormalizationPreset]]
          >
        ).map(([presetKey, preset]) => (
          <Tooltip key={presetKey}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={presetKey}
                aria-label={`${preset.label} peak normalization`}
                className="h-8 w-9 p-0"
              >
                <NormalizationLevelIcon level={presetKey} />
                <span className="sr-only">{preset.label}</span>
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>{preset.label} normalization</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
}
