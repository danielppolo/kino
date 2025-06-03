"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { format, sub } from "date-fns";

import { DrawerPopover } from "../ui/drawer-popover";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function DateRangePicker({
  variant = "outline",
  selected,
  onSelect,
}: Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  selected?: DateRange;
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  onSelect: (range?: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const handlePresetChange = (value: "week" | "month" | "year" | "all") => {
    setOpen(false);

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
    <DrawerPopover
      open={open}
      onOpenChange={setOpen}
      title="Add Label"
      description="Create a new label to start tracking your"
      trigger={
        <Button
          id="date"
          variant={variant}
          size="sm"
          className={cn(
            "justify-start gap-2 text-left font-normal",
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
            <span>Timeframe</span>
          )}
        </Button>
      }
    >
      <Calendar
        initialFocus
        mode="range"
        defaultMonth={selected?.from}
        selected={selected}
        onSelect={onSelect}
        numberOfMonths={1}
        className="w-full"
      />
      <ToggleGroup
        type="single"
        // defaultValue="month"
        onValueChange={handlePresetChange}
        className="m-2 flex flex-col justify-center gap-2"
      >
        <ToggleGroupItem value="week">This week</ToggleGroupItem>
        <ToggleGroupItem value="month">This month</ToggleGroupItem>
        <ToggleGroupItem value="year">This year</ToggleGroupItem>
        <ToggleGroupItem value="all">All time</ToggleGroupItem>
      </ToggleGroup>
    </DrawerPopover>
  );
}
