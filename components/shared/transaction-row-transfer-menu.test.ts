import { describe, expect, it } from "vitest";

import {
  getCrossCurrencyTransferPrefill,
  getTransferDestinationWallets,
} from "./transaction-row-transfer-menu";

import type { TransactionList } from "@/utils/supabase/types";

describe("getTransferDestinationWallets", () => {
  const transaction: Pick<
    TransactionList,
    | "id"
    | "wallet_id"
    | "currency"
    | "amount_cents"
    | "date"
    | "type"
    | "transfer_id"
    | "transfer_wallet_id"
  > = {
    id: "transaction-1",
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

  it("returns all wallets except the source wallet for eligible income", () => {
    expect(getTransferDestinationWallets(transaction, wallets)).toEqual([
      wallets[1],
      wallets[2],
    ]);
  });

  it("returns all wallets except the source wallet for eligible expenses", () => {
    expect(
      getTransferDestinationWallets(
        { ...transaction, type: "expense", amount_cents: -1234 },
        wallets,
      ),
    ).toEqual([wallets[1], wallets[2]]);
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
      getTransferDestinationWallets(
        { ...transaction, type: "expense" },
        wallets,
      ),
    ).toEqual([]);

    expect(
      getTransferDestinationWallets(
        { ...transaction, amount_cents: -1234 },
        wallets,
      ),
    ).toEqual([]);
  });
});

describe("getCrossCurrencyTransferPrefill", () => {
  const transaction = {
    id: "transaction-source",
    wallet_id: "wallet-usd",
    currency: "USD",
    amount_cents: -1234,
    date: "2026-08-01",
    description: "Move money",
  };

  it("seeds the transfer form for a cross-currency wallet", () => {
    expect(
      getCrossCurrencyTransferPrefill(transaction, {
        id: "wallet-eur",
        name: "Euro wallet",
        currency: "EUR",
      }),
    ).toEqual({
      senderWalletId: "wallet-usd",
      receiverWalletId: "wallet-eur",
      senderAmount: 12.34,
      date: "2026-08-01",
      description: "Move money",
    });
  });

  it("keeps same-currency wallets on the immediate creation path", () => {
    expect(
      getCrossCurrencyTransferPrefill(transaction, {
        id: "wallet-usd-2",
        name: "Savings",
        currency: "USD",
      }),
    ).toBeNull();
  });
});
