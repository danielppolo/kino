"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import { getAdjacentDateValue } from "@/components/ui/date-picker-utils";
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

  const handleAdjacentDate = (
    direction: "previous" | "next",
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (value && date) {
      onChange(getAdjacentDateValue(value, direction, event.shiftKey));
    }
  };

  return (
    <ButtonGroup className="w-full min-w-0">
      <Button
        variant={variant}
        size="icon"
        className="h-10 w-10 shrink"
        onClick={(event) => handleAdjacentDate("previous", event)}
        disabled={!date}
        aria-label="Previous day"
        type="button"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            className={cn(
              "min-w-0 flex-1 justify-between text-left font-normal",
              "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">
              {date ? format(date, "PP") : "Pick a date"}
            </span>
            {variant === "outline" && (
              <CalendarIcon className="ml-2 size-4 shrink-0" />
            )}
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
        className="h-10 w-10 shrink"
        onClick={(event) => handleAdjacentDate("next", event)}
        disabled={!date}
        aria-label="Next day"
        type="button"
      >
        <ChevronRight className="size-4" />
      </Button>
    </ButtonGroup>
  );
}

export default React.memo(DaterPicker);
