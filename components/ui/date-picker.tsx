"use client";

import * as React from "react";
import { format, parse } from "date-fns";
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
  const [open, setOpen] = React.useState(false);
  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  const handleChange = (date?: Date) => {
    onChange(date && format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={cn("text-left font-normal", "text-muted-foreground")}
        >
          {date ? format(date, "PP") : <span>Pick a date</span>}
          {variant === "outline" && <CalendarIcon className="ml-2 h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default React.memo(DaterPicker);
