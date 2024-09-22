"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { FormControl } from "./form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DaterPicker({
  value,
  variant = "outline",
  onChange,
}: React.HTMLAttributes<HTMLInputElement> & {
  value?: Date;
  variant?: "outline" | "ghost";
  onChange: (date: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          className={cn(
            "text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value ? format(value, "PP") : <span>Pick a date</span>}
          {variant === "outline" && <CalendarIcon className="w-4 h-4 ml-2" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
