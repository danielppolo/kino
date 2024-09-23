"use client";

import * as React from "react";
import clsx from "clsx";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DescriptionInput({
  defaultValue,
  variant = "outline",
  ...props
}: React.HTMLAttributes<HTMLInputElement> & {
  defaultValue?: string;
  variant: "ghost" | "outline";
}) {
  return (
    <Input
      type="text"
      defaultValue={defaultValue}
      placeholder="Enter description"
      className={cn(
        clsx({
          "border-none": variant === "ghost",
        }),
      )}
      {...props}
    />
  );
}
