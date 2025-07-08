import { addDays } from "date-fns";

/**
 * Calculate the next run date for a recurring transaction based on its interval type
 * @param currentDate - The current date to calculate from
 * @param intervalType - The interval type: "daily", "weekly", or "monthly"
 * @returns The next run date as a Date object
 */
export function calculateNextRunDate(
  currentDate: Date,
  intervalType: string,
): Date {
  switch (intervalType) {
    case "daily":
      return addDays(currentDate, 1);
    case "weekly":
      return addDays(currentDate, 7);
    case "monthly":
      const nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      return nextDate;
    default:
      throw new Error(`Unsupported interval type: ${intervalType}`);
  }
}
