"use client";

import { useState } from "react";
import { add, format, sub } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DateRangeFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize dateRange from search params or default to null
  const [dateRange, setDateRange] = useState({
    start: searchParams.get("start")
      ? new Date(searchParams.get("start") as string)
      : null,
    end: searchParams.get("end")
      ? new Date(searchParams.get("end") as string)
      : null,
  });

  const updateSearchParams = (newRange: {
    start: Date | null;
    end: Date | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Set start and end in the URL
    if (newRange.start) {
      params.set("start", newRange.start.toISOString());
    } else {
      params.delete("start");
    }

    if (newRange.end) {
      params.set("end", newRange.end.toISOString());
    } else {
      params.delete("end");
    }

    // Push new URL with updated query parameters
    const queryString = params.toString();
    router.push(`?${queryString}`);
  };

  const handleDateRangeChange = (newRange: {
    start: Date | null;
    end: Date | null;
  }) => {
    setDateRange(newRange);
    updateSearchParams(newRange);
  };

  const handlePreviousPeriod = () => {
    if (dateRange.start && dateRange.end) {
      const diff = dateRange.end.getTime() - dateRange.start.getTime();
      const seconds = diff / 1000;
      handleDateRangeChange({
        start: sub(dateRange.start, { seconds }),
        end: sub(dateRange.end, { seconds }),
      });
    }
  };

  const handleNextPeriod = () => {
    if (dateRange.start && dateRange.end) {
      const diff = dateRange.end.getTime() - dateRange.start.getTime();
      const seconds = diff / 1000;
      handleDateRangeChange({
        start: add(dateRange.start, { seconds }),
        end: add(dateRange.end, { seconds }),
      });
    }
  };

  return (
    <div className="flex items-center justify-between space-x-2 mb-6">
      {/* Preset Date Range Buttons */}
      <div className="flex space-x-2">
        <Button
          onClick={() =>
            handleDateRangeChange({
              start: sub(new Date(), { days: 7 }),
              end: new Date(),
            })
          }
        >
          Week
        </Button>
        <Button
          onClick={() =>
            handleDateRangeChange({
              start: sub(new Date(), { months: 1 }),
              end: new Date(),
            })
          }
        >
          Month
        </Button>
        <Button
          onClick={() =>
            handleDateRangeChange({
              start: sub(new Date(), { years: 1 }),
              end: new Date(),
            })
          }
        >
          Year
        </Button>
        <Button
          onClick={() => handleDateRangeChange({ start: null, end: null })}
        >
          All Time
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.start && dateRange.end
                ? `${format(dateRange.start, "PPP")} - ${format(dateRange.end, "PPP")}`
                : "Custom"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) =>
                handleDateRangeChange({
                  start: range?.from || null,
                  end: range?.to || null,
                })
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Pagination Buttons */}
      <div className="flex space-x-2">
        <Button onClick={handlePreviousPeriod}>Previous</Button>
        <Button onClick={handleNextPeriod}>Next</Button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
