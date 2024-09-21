"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

export function AmountInput({
  defaultValue,
  ...props
}: React.HTMLAttributes<HTMLInputElement> & { defaultValue?: number }) {
  return (
    <Input
      type="number"
      placeholder="Enter amount"
      defaultValue={defaultValue}
      {...props}
    />
  );
}
