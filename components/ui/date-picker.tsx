"use client";

import * as React from "react";
import { addDays, format, parse, subDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  className,
  onChange,
}: Omit<React.HTMLAttributes<HTMLInputElement>, "onChange"> & {
  value?: string;
  variant?: "outline" | "ghost";
  className?: string;
  onChange: (date?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  const handleChange = (date?: Date) => {
    onChange(date && format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  const handlePreviousDay = () => {
    if (date) {
      const previousDate = subDays(date, 1);
      onChange(format(previousDate, "yyyy-MM-dd"));
    }
  };

  const handleNextDay = () => {
    if (date) {
      const nextDate = addDays(date, 1);
      onChange(format(nextDate, "yyyy-MM-dd"));
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={variant}
        size="icon"
        className="h-9 w-9"
        onClick={handlePreviousDay}
        disabled={!date}
        aria-label="Previous day"
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            className={cn(
              "w-full grow text-left font-normal",
              "text-muted-foreground",
              className,
            )}
          >
            {date ? format(date, "PP") : <span>Pick a date</span>}
            {variant === "outline" && <CalendarIcon className="ml-2 h-4 w-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            onSelect={handleChange}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant={variant}
        size="icon"
        className="h-9 w-9"
        onClick={handleNextDay}
        disabled={!date}
        aria-label="Next day"
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default React.memo(DaterPicker);
