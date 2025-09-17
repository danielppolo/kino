"use client";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DateRangePicker } from "@/components/ui/date-range-picker";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const DateRangeFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

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
