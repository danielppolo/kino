"use client";

import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { add, endOfMonth, format, parse, startOfMonth, sub } from "date-fns";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

function MonthPagination() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Parse dates using the yyyy-MM-dd format
  const from = fromParam
    ? parse(fromParam, "yyyy-MM-dd", new Date())
    : undefined;
  const to = toParam ? parse(toParam, "yyyy-MM-dd", new Date()) : undefined;

  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
  const [yearPopoverOpen, setYearPopoverOpen] = useState(false);

  const setDateRange = ({ from, to }: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) {
      params.set("from", format(from, "yyyy-MM-dd"));
    } else {
      params.delete("from");
    }
    if (to) {
      params.set("to", format(to, "yyyy-MM-dd"));
    } else {
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2014 },
    (_, i) => currentYear - i,
  );

  const handleMonthSelect = (monthName: string) => {
    if (!from) return;

    const monthIndex = months.indexOf(monthName);
    const newDate = new Date(from.getFullYear(), monthIndex, 1);

    setDateRange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
    setMonthPopoverOpen(false);
  };

  const handleYearSelect = (year: number) => {
    if (!from) return;

    const newDate = new Date(year, from.getMonth(), 1);

    setDateRange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
    setYearPopoverOpen(false);
  };

  const handlePreviousMonth = () => {
    if (!from) return;

    const newDate = sub(from, { months: 1 });
    setDateRange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
  };

  const handleNextMonth = () => {
    if (!from) return;

    const newDate = add(from, { months: 1 });
    setDateRange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
  };

  // Keyboard event listener for arrow keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when popovers are closed
      if (monthPopoverOpen || yearPopoverOpen) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handlePreviousMonth();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleNextMonth();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [from, monthPopoverOpen, yearPopoverOpen]);

  if (!from || !to)
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          setDateRange({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
          })
        }
      >
        This month
      </Button>
    );

  const currentMonth = months[from.getMonth()];
  const currentYearValue = from.getFullYear();

  return (
    <div className="flex h-full w-full items-center">
      {/* Month Popover */}
      <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="justify-between px-1">
            <Text>{currentMonth}</Text>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search month..." />
            <CommandList>
              <CommandEmpty>No month found.</CommandEmpty>
              <CommandGroup>
                {months.map((month) => (
                  <CommandItem
                    key={month}
                    onSelect={() => handleMonthSelect(month)}
                  >
                    <Text
                      className={cn(
                        "w-full",
                        currentMonth === month && "font-medium",
                      )}
                    >
                      {month}
                    </Text>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Year Popover */}
      <Popover open={yearPopoverOpen} onOpenChange={setYearPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="justify-between px-1">
            <Text>{currentYearValue}</Text>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search year..." />
            <CommandList>
              <CommandEmpty>No year found.</CommandEmpty>
              <CommandGroup>
                {years.map((year) => (
                  <CommandItem
                    key={year}
                    onSelect={() => handleYearSelect(year)}
                  >
                    <Text
                      className={cn(
                        "w-full",
                        currentYearValue === year && "font-medium",
                      )}
                    >
                      {year}
                    </Text>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default MonthPagination;
