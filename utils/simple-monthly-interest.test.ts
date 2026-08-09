import { describe, expect, it } from "vitest";

import { calculateSimpleMonthlyInterestCents } from "@/utils/simple-monthly-interest";

describe("calculateSimpleMonthlyInterestCents", () => {
  it("does not charge interest during the due month", () => {
    expect(
      calculateSimpleMonthlyInterestCents({
        annualRatePercent: 12,
        asOfDate: "2026-01-31",
        dueDate: "2026-01-10",
        payments: [],
        principalCents: 100_00,
      }),
    ).toBe(0);
  });

  it("charges simple monthly interest without compounding", () => {
    expect(
      calculateSimpleMonthlyInterestCents({
        annualRatePercent: 12,
        asOfDate: "2026-03-01",
        dueDate: "2026-01-10",
        payments: [],
        principalCents: 100_00,
      }),
    ).toBe(200);
  });

  it("reduces principal with payments made before a monthly charge", () => {
    expect(
      calculateSimpleMonthlyInterestCents({
        annualRatePercent: 12,
        asOfDate: "2026-03-01",
        dueDate: "2026-01-10",
        payments: [
          { amountCents: 40_00, date: "2026-01-31" },
          { amountCents: 10_00, date: "2026-02-15" },
        ],
        principalCents: 100_00,
      }),
    ).toBe(110);
  });

  it("charges the month when payment is made on the charge date", () => {
    expect(
      calculateSimpleMonthlyInterestCents({
        annualRatePercent: 12,
        asOfDate: "2026-02-01",
        dueDate: "2026-01-10",
        payments: [{ amountCents: 100_00, date: "2026-02-01" }],
        principalCents: 100_00,
      }),
    ).toBe(100);
  });
});
