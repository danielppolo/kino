"use client";

import * as React from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export type AmountInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
> & {
  defaultValue?: number;
  variant?: "ghost" | "outline";
  symbolClassName?: string;
  currencyClassName?: string;
  currency?: string;
};

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      defaultValue,
      variant = "outline",
      className,
      symbolClassName,
      currencyClassName,
      currency,
      ...props
    },
    ref,
  ) => {
    const defaultValueProps =
      props.value === undefined ? { defaultValue: defaultValue ?? "" } : {};

    return (
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
          className={cn(
            className,
            "border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
          )}
          {...defaultValueProps}
          {...props}
        />
        {currency ? (
          <InputGroupAddon
            align="inline-end"
            className={cn(variant === "ghost" && "pr-0")}
          >
            <InputGroupText className={currencyClassName}>
              {currency}
            </InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    );
  },
);
AmountInput.displayName = "AmountInput";

export const TransactionAmountInput = React.forwardRef<
  HTMLInputElement,
  AmountInputProps
>(({ className, currencyClassName, symbolClassName, ...props }, ref) => (
  <AmountInput
    {...props}
    ref={ref}
    variant="ghost"
    symbolClassName={cn("text-4xl font-semibold", symbolClassName)}
    currencyClassName={cn("text-4xl font-semibold", currencyClassName)}
    className={cn(
      "h-auto [appearance:textfield] px-2 text-4xl font-semibold shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none sm:text-4xl lg:text-4xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      className,
    )}
  />
));
TransactionAmountInput.displayName = "TransactionAmountInput";
