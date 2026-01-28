"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface StackOffsetToggleProps {
  value: "percentage" | "absolute";
  onValueChange: (value: "percentage" | "absolute") => void;
}

export function StackOffsetToggle({
  value,
  onValueChange,
}: StackOffsetToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as "percentage" | "absolute")}
      size="sm"
      variant="outline"
    >
      <ToggleGroupItem value="percentage" aria-label="Show as percentage">
        Percentage
      </ToggleGroupItem>
      <ToggleGroupItem value="absolute" aria-label="Show as absolute values">
        Absolute
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
