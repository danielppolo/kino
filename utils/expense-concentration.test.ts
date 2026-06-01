import { describe, expect, it } from "vitest";

import { buildExpenseConcentrationData } from "@/utils/expense-concentration";

describe("buildExpenseConcentrationData", () => {
  it("converts each wallet category total to base currency before ranking and percentages", () => {
    const result = buildExpenseConcentrationData({
      rows: [
        {
          category_id: "food",
          outcome_cents: -10_000,
          wallet_id: "usd-wallet",
          categories: { name: "Food" },
        },
        {
          category_id: "rent",
          outcome_cents: -50_000,
          wallet_id: "mxn-wallet",
          categories: { name: "Rent" },
        },
      ],
      walletMap: new Map([
        ["usd-wallet", { currency: "USD" }],
        ["mxn-wallet", { currency: "MXN" }],
      ]),
      conversionRates: {
        USD: { rate: 1 },
        MXN: { rate: 0.05 },
      },
      baseCurrency: "USD",
      topN: 1,
    });

    expect(result).toEqual([
      {
        category_id: "food",
        category_name: "Food",
        total_cents: 10_000,
        percentage: 80,
      },
      {
        category_id: "other",
        category_name: "Other",
        total_cents: 2_500,
        percentage: 20,
      },
    ]);
  });
});
