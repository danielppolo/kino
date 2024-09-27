"use client";

import { add, sub } from "date-fns";

import { DaterRangePicker } from "../ui/date-range-picker";
import { PaginationNext, PaginationPrevious } from "../ui/pagination";

import { useFilter } from "@/app/protected/filter-context";

const DateRangeFilter = () => {
  const {
    filters: { dateRange },
    setDateRange,
  } = useFilter();

  const handleDateRangeChange = (newRange: {
    from: Date | undefined;
    to: Date | undefined;
  }) => {
    setDateRange(newRange);
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
