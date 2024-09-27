"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AmountInput({
  defaultValue,
  variant = "outline",
  className,
  ...props
}: React.HTMLAttributes<HTMLInputElement> & {
  defaultValue?: number;
  variant?: "ghost" | "outline";
}) {
  return (
    <div className="relative">
      <span
        className={cn(
          className,
          "absolute left-2 top-1/2 transform -translate-y-1/2 opacity-80",
        )}
      >
        $
      </span>
      <Input
        type="number"
        min={0}
        placeholder="Enter amount"
        defaultValue={Math.abs(defaultValue || 0)}
        className={cn(className, "pl-[18px]", {
          "border-none": variant === "ghost",
        })}
        {...props}
      />
    </div>
  );
}
