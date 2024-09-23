"use client";

import * as React from "react";
import clsx from "clsx";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AmountInput({
  defaultValue,
  variant = "outline",
  ...props
}: React.HTMLAttributes<HTMLInputElement> & {
  defaultValue?: number;
  variant?: "ghost" | "outline";
}) {
  return (
    <Input
      type="number"
      min={0}
      placeholder="Enter amount"
      defaultValue={Math.abs(defaultValue || 0)}
      className={cn(
        clsx({
          "border-none": variant === "ghost",
        }),
      )}
      {...props}
    />
  );
}
