"use client";

import * as React from "react";

import { Text } from "../ui/typography";

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
      <Text
        as="span"
        small
        muted
        className={cn(
          className,
          "absolute top-1/2 left-2 -translate-y-1/2 transform",
        )}
      >
        $
      </Text>
      <Input
        type="number"
        step="any"
        placeholder="0"
        defaultValue={defaultValue ?? ""}
        className={cn(className, "pl-[20px]", {
          "border-none": variant === "ghost",
        })}
        {...props}
      />
    </div>
  );
}
