"use client";
import { format } from "date-fns";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const DateRangeFilter = () => {
  const [filters, setFilters] = useTransactionQueryState();
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;

  const setDateRange = ({ from, to }: DateRange) => {
    setFilters({
      from: from ? format(from, "yyyy-MM-dd") : null,
      to: to ? format(to, "yyyy-MM-dd") : null,
    });
  };

  return (
    <DateRangePicker
      variant={from || to ? "secondary" : "ghost"}
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
  );
};

export default DateRangeFilter;
