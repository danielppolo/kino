import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateTransfer } from "./mutations";

import { createClient } from "@/utils/supabase/client";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);

function createSupabase(amounts: number[]) {
  const updates: Array<{ id: string; amount_cents: number }> = [];
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({
        data: amounts.map((amount_cents, index) => ({
          id: `transaction-${index}`,
          amount_cents,
        })),
        error: null,
      })),
    })),
    update: vi.fn((data: { amount_cents: number }) => ({
      eq: vi.fn(async (_field: string, id: string) => {
        updates.push({ id, amount_cents: data.amount_cents });
        return { error: null };
      }),
    })),
  }));

  return { from, updates };
}

describe("updateTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates outgoing and incoming legs with independent amounts", async () => {
    const supabase = createSupabase([-5000, 4600]);
    mockedCreateClient.mockReturnValue(supabase as never);

    await updateTransfer("transfer-1", {
      description: "Updated transfer",
      sender_amount_cents: 10000,
      receiver_amount_cents: 9250,
    });

    expect(supabase.updates).toEqual([
      { id: "transaction-0", amount_cents: -10000 },
      { id: "transaction-1", amount_cents: 9250 },
    ]);
  });

  it("rejects transfer pairs without one positive and one negative leg", async () => {
    const supabase = createSupabase([0, 4600]);
    mockedCreateClient.mockReturnValue(supabase as never);

    await expect(
      updateTransfer("transfer-1", {
        sender_amount_cents: 10000,
        receiver_amount_cents: 9250,
      }),
    ).rejects.toThrow(
      "Invalid transfer: expected one outgoing and one incoming leg",
    );
  });

  it("rejects non-positive amounts before accessing the database", async () => {
    await expect(
      updateTransfer("transfer-1", {
        sender_amount_cents: 10000,
        receiver_amount_cents: 0,
      }),
    ).rejects.toThrow("Transfer amounts must be positive");
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });
});
