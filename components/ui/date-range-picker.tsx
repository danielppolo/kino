"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { format, sub } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DaterRangePicker({
  selected,
  className,
  onSelect,
}: Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  selected?: DateRange;
  onSelect: (range?: DateRange) => void;
}) {
  const handlePresetChange = (value: "week" | "month" | "year" | "all") => {
    if (value === "week") {
      return onSelect({
        from: sub(new Date(), { days: 7 }),
        to: new Date(),
      });
    }

    if (value === "month") {
      return onSelect({
        from: sub(new Date(), { months: 1 }),
        to: new Date(),
      });
    }

    if (value === "year") {
      return onSelect({
        from: sub(new Date(), { years: 1 }),
        to: new Date(),
      });
    }

    onSelect({ from: undefined, to: undefined });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected?.from ? (
              selected.to ? (
                <>
                  {format(selected.from, "LLL dd, y")} -{" "}
                  {format(selected.to, "LLL dd, y")}
                </>
              ) : (
                format(selected.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="center"
          //  className="flex w-auto flex-col space-y-2 p-2"
        >
          <ToggleGroup
            type="single"
            // defaultValue="month"
            onValueChange={handlePresetChange}
            className="flex justify-center gap-2 m-2"
          >
            <ToggleGroupItem value="week">This week</ToggleGroupItem>
            <ToggleGroupItem value="month">This month</ToggleGroupItem>
            <ToggleGroupItem value="year">This year</ToggleGroupItem>
            <ToggleGroupItem value="all">All time</ToggleGroupItem>
          </ToggleGroup>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={onSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
