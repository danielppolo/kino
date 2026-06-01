import { describe, expect, it } from "vitest";

import { buildTransactionSizeDistributionData } from "@/utils/transaction-size-distribution";

describe("buildTransactionSizeDistributionData", () => {
  it("buckets and totals transactions after converting them to base currency", () => {
    const result = buildTransactionSizeDistributionData({
      rows: [
        {
          amount_cents: 20_000,
          wallet_id: "mxn-wallet",
        },
        {
          amount_cents: -6_000,
          wallet_id: "usd-wallet",
        },
      ],
      walletMap: new Map([
        ["mxn-wallet", { currency: "MXN" }],
        ["usd-wallet", { currency: "USD" }],
      ]),
      conversionRates: {
        USD: { rate: 1 },
        MXN: { rate: 0.05 },
      },
      baseCurrency: "USD",
    });

    expect(result).toEqual([
      { range: "$10-$50", count: 1, total_amount_cents: 1_000 },
      { range: "$50-$100", count: 1, total_amount_cents: 6_000 },
    ]);
  });
});
