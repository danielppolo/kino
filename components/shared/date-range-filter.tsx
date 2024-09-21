"use client";

import { useState } from "react";
import { add, sub } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

import { DatePickerWithRange } from "../ui/date-picker";

import { Button } from "@/components/ui/button";

const DateRangeFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState({
    from: searchParams.get("from")
      ? new Date(searchParams.get("from") as string)
      : null,
    to: searchParams.get("to")
      ? new Date(searchParams.get("to") as string)
      : null,
  });

  const updateSearchParams = (newRange: {
    from: Date | null;
    to: Date | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Set from and to in the URL
    if (newRange.from) {
      params.set("from", newRange.from.toISOString());
    } else {
      params.delete("from");
    }

    if (newRange.to) {
      params.set("to", newRange.to.toISOString());
    } else {
      params.delete("to");
    }

    // Push new URL with updated query parameters
    const queryString = params.toString();
    router.push(`?${queryString}`);
  };

  const handleDateRangeChange = (newRange: {
    from: Date | null;
    to: Date | null;
  }) => {
    setDateRange(newRange);
    updateSearchParams(newRange);
  };

  const handlePreviousPeriod = () => {
    if (dateRange.from && dateRange.to) {
      const diff = dateRange.to.getTime() - dateRange.from.getTime();
      const seconds = diff / 1000;
      handleDateRangeChange({
        from: sub(dateRange.from, { seconds }),
        to: sub(dateRange.to, { seconds }),
      });
    }
  };

  const handleNextPeriod = () => {
    if (dateRange.from && dateRange.to) {
      const diff = dateRange.to.getTime() - dateRange.from.getTime();
      const seconds = diff / 1000;
      handleDateRangeChange({
        from: add(dateRange.from, { seconds }),
        to: add(dateRange.to, { seconds }),
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
              from: sub(new Date(), { days: 7 }),
              to: new Date(),
            })
          }
        >
          Week
        </Button>
        <Button
          onClick={() =>
            handleDateRangeChange({
              from: sub(new Date(), { months: 1 }),
              to: new Date(),
            })
          }
        >
          Month
        </Button>
        <Button
          onClick={() =>
            handleDateRangeChange({
              from: sub(new Date(), { years: 1 }),
              to: new Date(),
            })
          }
        >
          Year
        </Button>
        <Button onClick={() => handleDateRangeChange({ from: null, to: null })}>
          All Time
        </Button>

        <DatePickerWithRange
          selected={dateRange}
          onSelect={(range) => {
            handleDateRangeChange({
              from: range?.from || null,
              to: range?.to || null,
            });
          }}
        />
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
