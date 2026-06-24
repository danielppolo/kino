import { addDays, addMonths, format, parse, subDays, subMonths } from "date-fns";

export type DatePickerDirection = "previous" | "next";

export function getAdjacentDateValue(
  value: string,
  direction: DatePickerDirection,
  byMonth: boolean,
) {
  const date = parse(value, "yyyy-MM-dd", new Date());
  const nextDate =
    direction === "previous"
      ? byMonth
        ? subMonths(date, 1)
        : subDays(date, 1)
      : byMonth
        ? addMonths(date, 1)
        : addDays(date, 1);

  return format(nextDate, "yyyy-MM-dd");
}
