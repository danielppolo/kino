import { describe, expect, it } from "vitest";

import {
  applyOptimisticTransaction,
  type InfiniteTransactionData,
} from "@/utils/optimistic-transactions";
import type { TransactionList } from "@/utils/supabase/types";

const transaction = (
  id: string,
  overrides: Partial<TransactionList> = {},
): TransactionList =>
  ({
    id,
    wallet_id: "wallet-1",
    category_id: "category-1",
    label_id: "label-1",
    amount_cents: -1000,
    base_amount_cents: -1000,
    created_at: null,
    currency: "USD",
    date: "2026-05-16",
    description: id,
    note: null,
    tag_ids: null,
    tags: null,
    transfer_id: null,
    transfer_wallet_id: null,
    type: "expense",
    ...overrides,
  }) as TransactionList;

describe("applyOptimisticTransaction", () => {
  it("keeps an edited transaction in its existing position", () => {
    const data: InfiniteTransactionData = {
      pages: [
        {
          data: [
            transaction("first"),
            transaction("edited", { description: "before" }),
            transaction("third"),
          ],
          error: null,
          count: 3,
        },
      ],
      pageParams: [0],
    };

    const updated = applyOptimisticTransaction(
      data,
      transaction("edited", { description: "after" }),
      "edited",
    );

    expect(updated.pages[0].data.map((item) => item.id)).toEqual([
      "first",
      "edited",
      "third",
    ]);
    expect(updated.pages[0].data[1].description).toBe("after");
  });

  it("prepends a new transaction when there is no edit target", () => {
    const data: InfiniteTransactionData = {
      pages: [
        {
          data: [transaction("existing")],
          error: null,
          count: 1,
        },
      ],
      pageParams: [0],
    };

    const updated = applyOptimisticTransaction(data, transaction("new"));

    expect(updated.pages[0].data.map((item) => item.id)).toEqual([
      "new",
      "existing",
    ]);
  });
});
