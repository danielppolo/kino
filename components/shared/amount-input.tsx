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
  variant: "ghost" | "outline";
}) {
  return (
    <Input
      type="number"
      placeholder="Enter amount"
      defaultValue={defaultValue}
      className={cn(
        clsx({
          "border-none": variant === "ghost",
        }),
      )}
      {...props}
    />
  );
}
