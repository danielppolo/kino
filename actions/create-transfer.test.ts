import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTransferTransaction } from "./create-transfer";

import { createClient } from "@/utils/supabase/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { uuidv4 } = vi.hoisted(() => ({ uuidv4: vi.fn() }));

vi.mock("uuid", () => ({ v4: uuidv4 }));
vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);

const transaction = {
  type: "transfer" as const,
  date: "2026-08-01",
  description: "Move money",
  sender_amount: 100,
  receiver_amount: 92.5,
};

function createSupabase(wallets: Array<Record<string, string>>) {
  const saveRows = (rows: Array<Record<string, unknown>>) => ({
    select: vi.fn(async () => ({
      data: rows.map((row, index) => ({
        ...row,
        id: row.id ?? `transaction-${index}`,
      })),
      error: null,
    })),
  });
  const insert = vi.fn((rows: Array<Record<string, unknown>>) => ({
    ...saveRows(rows),
  }));
  return {
    from: vi.fn((table: string) => {
      if (table === "wallets") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: wallets, error: null })),
          })),
        };
      }

      return {
        insert,
      };
    }),
    insert,
  };
}

describe("createTransferTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidv4
      .mockReset()
      .mockReturnValueOnce("transfer-1")
      .mockReturnValue("destination-1");
    vi.stubEnv("NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID", "category-between");
  });

  it("inserts cross-currency legs with independent amounts and currencies", async () => {
    const supabase = createSupabase([
      { id: "wallet-usd", currency: "USD", workspace_id: "workspace-1" },
      { id: "wallet-eur", currency: "EUR", workspace_id: "workspace-1" },
    ]);
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await createTransferTransaction(
      transaction,
      "wallet-usd",
      "wallet-eur",
    );

    expect(result.error).toBeNull();
    expect(supabase.insert).toHaveBeenCalledTimes(1);
    expect(supabase.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        wallet_id: "wallet-usd",
        currency: "USD",
        amount_cents: -10000,
        transfer_id: "transfer-1",
      }),
      expect.objectContaining({
        wallet_id: "wallet-eur",
        currency: "EUR",
        amount_cents: 9250,
        transfer_id: "transfer-1",
      }),
    ]);
  });

  it("rejects identical wallets before accessing the database", async () => {
    const result = await createTransferTransaction(
      transaction,
      "wallet-usd",
      "wallet-usd",
    );

    expect(result.error).toBe("Sender and receiver wallets must be different");
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("rejects non-positive amounts before accessing the database", async () => {
    const result = await createTransferTransaction(
      { ...transaction, receiver_amount: 0.001 },
      "wallet-usd",
      "wallet-eur",
    );

    expect(result.error).toBe("Transfer amounts must be positive");
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("rejects missing wallets", async () => {
    const supabase = createSupabase([
      { id: "wallet-usd", currency: "USD", workspace_id: "workspace-1" },
    ]);
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await createTransferTransaction(
      transaction,
      "wallet-usd",
      "wallet-eur",
    );

    expect(result.error).toBe("Sender or receiver wallet not found");
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it("rejects wallets from different workspaces", async () => {
    const supabase = createSupabase([
      { id: "wallet-usd", currency: "USD", workspace_id: "workspace-1" },
      { id: "wallet-eur", currency: "EUR", workspace_id: "workspace-2" },
    ]);
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await createTransferTransaction(
      transaction,
      "wallet-usd",
      "wallet-eur",
    );

    expect(result.error).toBe(
      "Sender and receiver wallets must belong to the same workspace",
    );
    expect(supabase.insert).not.toHaveBeenCalled();
  });
});
