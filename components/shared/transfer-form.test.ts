import { describe, expect, it } from "vitest";

import {
  getTransferPairValues,
  normalizeTransferAmounts,
} from "./transfer-form";

describe("normalizeTransferAmounts", () => {
  it("mirrors the sender amount for same-currency transfers", () => {
    expect(
      normalizeTransferAmounts({
        senderAmount: 100.25,
        receiverAmount: 1,
        senderCurrency: "USD",
        receiverCurrency: "USD",
      }),
    ).toEqual({ senderAmount: 100.25, receiverAmount: 100.25 });
  });

  it("keeps independent amounts for cross-currency transfers", () => {
    expect(
      normalizeTransferAmounts({
        senderAmount: 100,
        receiverAmount: 92.5,
        senderCurrency: "USD",
        receiverCurrency: "EUR",
      }),
    ).toEqual({ senderAmount: 100, receiverAmount: 92.5 });
  });
});

describe("getTransferPairValues", () => {
  it("finds sender and receiver by sign regardless of the opened leg", () => {
    const receiver = {
      type: "transfer" as const,
      wallet_id: "wallet-eur",
      amount_cents: 9250,
      date: "2026-08-01",
      description: "Move money",
      category_id: "category-between",
      label_id: null,
    };
    const sender = {
      ...receiver,
      wallet_id: "wallet-usd",
      amount_cents: -10000,
    };

    expect(getTransferPairValues([receiver, sender])).toEqual(
      expect.objectContaining({
        sender_wallet_id: "wallet-usd",
        receiver_wallet_id: "wallet-eur",
        sender_amount: 100,
        receiver_amount: 92.5,
      }),
    );
  });
});
