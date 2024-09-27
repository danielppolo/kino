"use client";

import { useState } from "react";
import { add, sub } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

import { DaterRangePicker } from "../ui/date-range-picker";
import { PaginationNext, PaginationPrevious } from "../ui/pagination";

const DateRangeFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState({
    from: searchParams.get("from")
      ? new Date(searchParams.get("from") as string)
      : undefined,
    to: searchParams.get("to")
      ? new Date(searchParams.get("to") as string)
      : undefined,
  });

  const updateSearchParams = (newRange: {
    from: Date | undefined;
    to: Date | undefined;
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
    from: Date | undefined;
    to: Date | undefined;
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
    <div className="w-full flex justify-center items-center gap-2 p-2">
      <PaginationPrevious onClick={handlePreviousPeriod} />
      <DaterRangePicker
        selected={dateRange}
        onSelect={(range) => {
          handleDateRangeChange({
            from: range?.from || undefined,
            to: range?.to || undefined,
          });
        }}
      />
      <PaginationNext onClick={handleNextPeriod} />
    </div>
  );
};

export default DateRangeFilter;
