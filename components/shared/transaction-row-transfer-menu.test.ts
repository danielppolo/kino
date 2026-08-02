import { describe, expect, it } from "vitest";

import { getTransferDestinationWallets } from "./transaction-row-transfer-menu";

import type { TransactionList } from "@/utils/supabase/types";

describe("getTransferDestinationWallets", () => {
  const transaction: Pick<
    TransactionList,
    | "wallet_id"
    | "currency"
    | "amount_cents"
    | "date"
    | "type"
    | "transfer_id"
    | "transfer_wallet_id"
  > = {
    wallet_id: "wallet-1",
    currency: "USD",
    amount_cents: 1234,
    date: "2026-06-24",
    type: "income",
    transfer_id: null,
    transfer_wallet_id: null,
  };

  const wallets = [
    { id: "wallet-1", name: "Checking", currency: "USD" },
    { id: "wallet-2", name: "Savings", currency: "USD" },
    { id: "wallet-3", name: "Brokerage", currency: "EUR" },
  ];

  it("returns same-currency wallets except the source wallet for eligible income", () => {
    expect(getTransferDestinationWallets(transaction, wallets)).toEqual([
      wallets[1],
    ]);
  });

  it("returns same-currency wallets except the source wallet for eligible expenses", () => {
    expect(
      getTransferDestinationWallets(
        { ...transaction, type: "expense", amount_cents: -1234 },
        wallets,
      ),
    ).toEqual([wallets[1]]);
  });

  it("returns no wallets for transactions that already belong to a transfer", () => {
    expect(
      getTransferDestinationWallets(
        { ...transaction, transfer_id: "transfer-1" },
        wallets,
      ),
    ).toEqual([]);
  });

  it("returns no wallets when the amount sign does not match the type", () => {
    expect(
      getTransferDestinationWallets({ ...transaction, type: "expense" }, wallets),
    ).toEqual([]);

    expect(
      getTransferDestinationWallets(
        { ...transaction, amount_cents: -1234 },
        wallets,
      ),
    ).toEqual([]);
  });
});
