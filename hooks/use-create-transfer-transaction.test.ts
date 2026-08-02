import { describe, expect, it } from "vitest";

import {
  transactionRowFromValues,
  type TransferTransactionValues,
} from "./use-create-transfer-transaction";

const values: TransferTransactionValues = {
  type: "transfer",
  date: "2026-08-01",
  description: "Move money",
  sender_wallet_id: "wallet-usd",
  receiver_wallet_id: "wallet-eur",
  sender_amount: 100,
  receiver_amount: 92.5,
};

describe("transactionRowFromValues", () => {
  it("builds optimistic transfer legs with independent amounts and currencies", () => {
    const sender = transactionRowFromValues({
      values,
      id: "sender-transaction",
      walletId: values.sender_wallet_id,
      transferWalletId: values.receiver_wallet_id,
      amountCents: -10000,
      currency: "USD",
    });
    const receiver = transactionRowFromValues({
      values,
      id: "receiver-transaction",
      walletId: values.receiver_wallet_id,
      transferWalletId: values.sender_wallet_id,
      amountCents: 9250,
      currency: "EUR",
    });

    expect(sender).toEqual(
      expect.objectContaining({
        wallet_id: "wallet-usd",
        transfer_wallet_id: "wallet-eur",
        amount_cents: -10000,
        currency: "USD",
      }),
    );
    expect(receiver).toEqual(
      expect.objectContaining({
        wallet_id: "wallet-eur",
        transfer_wallet_id: "wallet-usd",
        amount_cents: 9250,
        currency: "EUR",
      }),
    );
  });
});
