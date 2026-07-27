"use client";

import * as React from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type AmountInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
> & {
  defaultValue?: number;
  variant?: "ghost" | "outline";
  symbolClassName?: string;
  currency?: string;
};

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      defaultValue,
      variant = "outline",
      className,
      symbolClassName,
      currency,
      ...props
    },
    ref,
  ) => (
    <InputGroup
      className={cn(
        "h-auto",
        variant === "ghost" &&
          "border-0 bg-transparent shadow-none has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-transparent",
      )}
    >
      <InputGroupAddon className={cn(variant === "ghost" && "pl-0")}>
        <InputGroupText className={symbolClassName}>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        ref={ref}
        type="number"
        step="any"
        placeholder="0.00"
        defaultValue={defaultValue ?? ""}
        className={cn(
          className,
          "border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
        )}
        {...props}
      />
      {currency ? (
        <InputGroupAddon
          align="inline-end"
          className={cn(variant === "ghost" && "pr-0")}
        >
          <InputGroupText>{currency}</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  ),
);
AmountInput.displayName = "AmountInput";
