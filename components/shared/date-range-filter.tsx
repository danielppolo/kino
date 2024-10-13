"use client";

import { add, sub } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

import { DaterRangePicker } from "../ui/date-range-picker";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const DateRangeFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  const setDateRange = ({ from, to }: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) {
      params.set("from", from.toISOString());
    } else {
      params.delete("from");
    }
    if (to) {
      params.set("to", to.toISOString());
    } else {
      params.delete("to");
    }
    router.push(`/app/transactions?${params.toString()}`);
  };

  const handlePreviousPeriod = () => {
    if (from && to) {
      const diff = to.getTime() - from.getTime();
      const seconds = diff / 1000;
      setDateRange({
        from: sub(from, { seconds }),
        to: sub(to, { seconds }),
      });
    }
  };

  const handleNextPeriod = () => {
    if (from && to) {
      const diff = to.getTime() - from.getTime();
      const seconds = diff / 1000;
      setDateRange({
        from: add(from, { seconds }),
        to: add(to, { seconds }),
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* <PaginationPrevious onClick={handlePreviousPeriod} /> */}
      <DaterRangePicker
        selected={{
          from,
          to,
        }}
        onSelect={(range) => {
          setDateRange({
            from: range?.from || undefined,
            to: range?.to || undefined,
          });
        }}
      />
      {/* <PaginationNext onClick={handleNextPeriod} /> */}
    </div>
  );
};

export default DateRangeFilter;
