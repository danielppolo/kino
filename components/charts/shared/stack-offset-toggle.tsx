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
  const isAbsolute = value === "absolute";

  return (
    <Toggle
      size="sm"
      variant="outline"
      pressed={isAbsolute}
      onPressedChange={(pressed) =>
        onValueChange(pressed ? "absolute" : "percentage")
      }
      aria-label={
        isAbsolute ? "Showing absolute values" : "Showing percentages"
      }
      className="px-2"
    >
      {isAbsolute ? (
        <DollarSign className="size-4" />
      ) : (
        <Percent className="size-4" />
      )}
    </Toggle>
  );
}
