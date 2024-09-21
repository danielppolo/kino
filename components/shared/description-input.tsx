"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

export function DescriptionInput({
  defaultValue,
  ...props
}: React.HTMLAttributes<HTMLInputElement> & { defaultValue?: number }) {
  return (
    <Input
      type="text"
      defaultValue={defaultValue}
      placeholder="Enter description"
      {...props}
    />
  );
}
