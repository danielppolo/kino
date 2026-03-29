"use client";

import { DollarSign, Percent } from "lucide-react";

import { Toggle } from "@/components/ui/toggle";

interface StackOffsetToggleProps {
  value: "percentage" | "absolute";
  onValueChange: (value: "percentage" | "absolute") => void;
}

export function StackOffsetToggle({
  value,
  onValueChange,
}: StackOffsetToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1">
      <Toggle
        size="sm"
        variant="outline"
        pressed={value === "percentage"}
        onPressedChange={(pressed) => pressed && onValueChange("percentage")}
        aria-label="Show as percentage"
      >
        <Percent className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        variant="outline"
        pressed={value === "absolute"}
        onPressedChange={(pressed) => pressed && onValueChange("absolute")}
        aria-label="Show as absolute values"
      >
        <DollarSign className="size-4" />
      </Toggle>
    </div>
  );
}
