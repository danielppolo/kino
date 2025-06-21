"use client";

import { DateRange } from "react-day-picker";
import { add, endOfMonth, format, startOfMonth, sub } from "date-fns";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Text } from "@/components/ui/typography";

function MonthPagination() {
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
      params.set("from", from.toISOString());
    } else {
      params.delete("from");
    }
    if (to) {
      params.set("to", to.toISOString());
    } else {
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
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

  return (
    <div className="flex h-full w-full items-center justify-between gap-2">
      <Text>{format(from || new Date(), "MMMM yyyy")}</Text>
      <div>
        <PaginationPrevious onClick={handlePreviousPeriod} />
        <PaginationNext onClick={handleNextPeriod} />
      </div>
    </div>
  );
}

export default MonthPagination;
