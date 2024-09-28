"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function DaterPicker({
  value,
  variant = "outline",
  onChange,
}: Omit<React.HTMLAttributes<HTMLInputElement>, "onChange"> & {
  value?: string;
  variant?: "outline" | "ghost";
  onChange: (date?: string) => void;
}) {
  const handleChange = (date?: Date) => {
    onChange(date && format(date, "yyyy-MM-dd"));
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={cn("text-left font-normal", "text-muted-foreground")}
        >
          {value ? format(new Date(value), "PP") : <span>Pick a date</span>}
          {variant === "outline" && <CalendarIcon className="w-4 h-4 ml-2" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={handleChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default React.memo(DaterPicker);
