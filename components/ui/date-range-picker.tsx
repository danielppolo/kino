"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { format, sub } from "date-fns";

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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="ghost"
          size="sm"
          className={cn(
            "justify-start text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
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
        className="w-auto flex p-0"
        align="start"
        //  className="flex w-auto flex-col space-y-2 p-2"
      >
        <ToggleGroup
          type="single"
          // defaultValue="month"
          onValueChange={handlePresetChange}
          className="flex flex-col justify-center gap-2 m-2"
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
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}
