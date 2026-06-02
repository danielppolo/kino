import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

import { createSupabaseMock } from "@/test/utils/supabase";
import {
  AuthRequiredError,
  ForbiddenError,
  NotFoundError,
  resolveWalletScope,
} from "@/utils/auth/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

const predictMock = vi.fn();
const trainMock = vi.fn();

vi.mock("arima", () => {
  return vi.fn().mockImplementation(() => ({
    train: trainMock,
    predict: predictMock,
  }));
});

vi.mock("@/utils/auth/server", async () => {
  const actual = await vi.importActual<typeof import("@/utils/auth/server")>(
    "@/utils/auth/server",
  );

  return {
    ...actual,
    resolveWalletScope: vi.fn(),
  };
});

vi.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

const mockedResolveWalletScope = vi.mocked(resolveWalletScope);
const mockedCreateServiceRoleClient = vi.mocked(createServiceRoleClient);

type QueryCall = {
  args: unknown[];
  method: string;
  table: string;
};

type ServiceRoleQuery = {
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  then: (
    resolve: (value: { data: unknown[]; error: null }) => void,
  ) => Promise<void>;
};

function createRequest(body: unknown) {
  return new Request("http://localhost/api/forecast", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    walletId: "wallet-1",
    walletIds: ["wallet-1"],
    horizon: 12,
    baseCurrency: "USD",
    conversionRates: {
      USD: { rate: 1 },
    },
    ...overrides,
  };
}

function createServiceRoleMock({
  balances = [],
  stats = [],
  wallets = [],
}: {
  balances?: Array<{
    balance_cents: number;
    month: string;
    wallet_id: string;
  }>;
  stats?: Array<{
    month: string;
    net_cents: number;
    outcome_cents: number;
    wallet_id: string;
  }>;
  wallets?: Array<{
    currency: string;
    id: string;
  }>;
} = {}) {
  const calls: QueryCall[] = [];

  const responseByTable: Record<string, unknown[]> = {
    wallets,
    wallet_monthly_balances: balances,
    monthly_stats: stats,
  };

  function from(table: string) {
    const query: ServiceRoleQuery = {
      select: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "select", args });
        return query;
      }),
      eq: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "eq", args });
        return query;
      }),
      in: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "in", args });
        return query;
      }),
      order: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "order", args });
        return query;
      }),
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        Promise.resolve({
          data: responseByTable[table] ?? [],
          error: null,
        }).then(resolve),
    };

    calls.push({ table, method: "from", args: [table] });
    return query;
  }

  return {
    calls,
    client: {
      from: vi.fn(from),
    },
  };
}

function mockAuthorizedScope({
  walletId = "wallet-1",
  walletIds = ["wallet-1"],
  requestedWallets,
}: {
  walletId?: string | null;
  walletIds?: string[];
  requestedWallets?: Array<{ id: string; workspace_id: string }>;
} = {}) {
  const supabase = createSupabaseMock({
    wallets: [
      {
        data:
          requestedWallets ??
          walletIds.map((id) => ({
            id,
            workspace_id: "workspace-1",
          })),
        error: null,
      },
    ],
  });

  mockedResolveWalletScope.mockResolvedValue({
    membership: {
      id: "membership-1",
      workspace_id: "workspace-1",
      user_id: "user-1",
      role: "owner",
      created_at: "2026-01-01",
      workspaces: {
        id: "workspace-1",
        name: "Workspace",
        base_currency: "USD",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        finance_memory: null,
        feature_flags: null,
        icon: null,
      },
    },
    supabase: supabase.client as never,
    user: { id: "user-1" } as never,
    walletId: walletId ?? undefined,
    walletIds,
    workspace: {
      id: "workspace-1",
      name: "Workspace",
      base_currency: "USD",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      finance_memory: null,
      feature_flags: null,
      icon: null,
    },
  });

  return supabase;
}

describe("forecast route", () => {
  beforeEach(() => {
    predictMock.mockReset();
    trainMock.mockReset();
    vi.mocked(createServiceRoleClient).mockReset();
    mockedResolveWalletScope.mockReset();
    predictMock.mockReturnValue([
      [100, 100],
      [10, 10],
    ]);
  });

  it("returns 401 for unauthenticated requests before creating a service-role client", async () => {
    mockedResolveWalletScope.mockRejectedValue(new AuthRequiredError());

    const response = await POST(createRequest(validBody()) as never);

    expect(response.status).toBe(401);
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid bodies before resolving scope", async () => {
    const missingBaseCurrency = await POST(
      createRequest(validBody({ baseCurrency: "" })) as never,
    );
    const invalidWalletIds = await POST(
      createRequest(
        validBody({ walletId: null, walletIds: ["wallet-1", 2] }),
      ) as never,
    );

    expect(missingBaseCurrency.status).toBe(400);
    expect(invalidWalletIds.status).toBe(400);
    expect(mockedResolveWalletScope).not.toHaveBeenCalled();
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("uses a sanitized single-wallet scope for authorized wallet requests", async () => {
    mockAuthorizedScope({ walletId: "wallet-1", walletIds: ["wallet-1"] });
    const serviceRole = createServiceRoleMock({
      wallets: [{ id: "wallet-1", currency: "USD" }],
      balances: [
        { wallet_id: "wallet-1", month: "2026-01-01", balance_cents: 10000 },
        { wallet_id: "wallet-1", month: "2026-02-01", balance_cents: 11000 },
        { wallet_id: "wallet-1", month: "2026-03-01", balance_cents: 12000 },
        { wallet_id: "wallet-1", month: "2026-04-01", balance_cents: 13000 },
      ],
      stats: [
        {
          wallet_id: "wallet-1",
          month: "2026-01-01",
          outcome_cents: -1000,
          net_cents: 1000,
        },
      ],
    });
    mockedCreateServiceRoleClient.mockReturnValue(serviceRole.client as never);

    const response = await POST(createRequest(validBody()) as never);

    expect(response.status).toBe(200);
    expect(mockedResolveWalletScope).toHaveBeenCalledWith({
      walletId: "wallet-1",
      requireActiveWorkspace: true,
    });
    expect(serviceRole.calls).toContainEqual({
      table: "wallet_monthly_balances",
      method: "eq",
      args: ["wallet_id", "wallet-1"],
    });
  });

  it("maps missing and unauthorized wallet scope errors to 404 and 403", async () => {
    mockedResolveWalletScope.mockRejectedValueOnce(new NotFoundError());
    const missing = await POST(createRequest(validBody()) as never);

    mockedResolveWalletScope.mockRejectedValueOnce(new ForbiddenError());
    const forbidden = await POST(createRequest(validBody()) as never);

    expect(missing.status).toBe(404);
    expect(forbidden.status).toBe(403);
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("dedupes requested aggregate wallet IDs before forecasting", async () => {
    mockAuthorizedScope({
      walletId: null,
      walletIds: ["wallet-1", "wallet-2"],
    });
    const serviceRole = createServiceRoleMock({
      wallets: [
        { id: "wallet-1", currency: "USD" },
        { id: "wallet-2", currency: "USD" },
      ],
    });
    mockedCreateServiceRoleClient.mockReturnValue(serviceRole.client as never);

    const response = await POST(
      createRequest(
        validBody({
          walletId: null,
          walletIds: ["wallet-2", "wallet-1", "wallet-1"],
        }),
      ) as never,
    );

    expect(response.status).toBe(200);
    expect(mockedResolveWalletScope).toHaveBeenCalledWith({
      requireActiveWorkspace: true,
    });
    expect(serviceRole.calls).toContainEqual({
      table: "wallet_monthly_balances",
      method: "in",
      args: ["wallet_id", ["wallet-1", "wallet-2"]],
    });
  });

  it("forecasts aggregate requests with requested wallets instead of the full authorized scope", async () => {
    mockAuthorizedScope({
      walletId: null,
      walletIds: ["wallet-1", "wallet-2"],
    });
    const serviceRole = createServiceRoleMock({
      wallets: [
        { id: "wallet-1", currency: "USD" },
        { id: "wallet-2", currency: "USD" },
      ],
    });
    mockedCreateServiceRoleClient.mockReturnValue(serviceRole.client as never);

    const response = await POST(
      createRequest(
        validBody({
          walletId: null,
          walletIds: ["wallet-1"],
        }),
      ) as never,
    );

    expect(response.status).toBe(200);
    expect(mockedResolveWalletScope).toHaveBeenCalledWith({
      requireActiveWorkspace: true,
    });
    expect(serviceRole.calls).toContainEqual({
      table: "wallets",
      method: "in",
      args: ["id", ["wallet-1"]],
    });
    expect(serviceRole.calls).toContainEqual({
      table: "wallet_monthly_balances",
      method: "in",
      args: ["wallet_id", ["wallet-1"]],
    });
    expect(serviceRole.calls).toContainEqual({
      table: "monthly_stats",
      method: "in",
      args: ["wallet_id", ["wallet-1"]],
    });
  });

  it("rejects aggregate requests with wallets outside the server-derived scope", async () => {
    mockAuthorizedScope({
      walletId: null,
      walletIds: ["wallet-1"],
      requestedWallets: [{ id: "wallet-1", workspace_id: "workspace-1" }],
    });

    const response = await POST(
      createRequest(
        validBody({
          walletId: null,
          walletIds: ["wallet-1", "foreign-wallet"],
        }),
      ) as never,
    );

    expect(response.status).toBe(403);
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rejects aggregate requests that mix workspaces", async () => {
    mockAuthorizedScope({
      walletId: null,
      walletIds: ["wallet-1", "wallet-2"],
      requestedWallets: [
        { id: "wallet-1", workspace_id: "workspace-1" },
        { id: "wallet-2", workspace_id: "workspace-2" },
      ],
    });

    const response = await POST(
      createRequest(
        validBody({
          walletId: null,
          walletIds: ["wallet-1", "wallet-2"],
        }),
      ) as never,
    );

    expect(response.status).toBe(400);
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rejects empty aggregate requests before broadening scope", async () => {
    const response = await POST(
      createRequest(validBody({ walletId: null, walletIds: [] })) as never,
    );

    expect(response.status).toBe(400);
    expect(mockedResolveWalletScope).not.toHaveBeenCalled();
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("clamps horizon to the supported range before forecasting", async () => {
    mockAuthorizedScope({ walletId: "wallet-1", walletIds: ["wallet-1"] });
    const serviceRole = createServiceRoleMock({
      wallets: [{ id: "wallet-1", currency: "USD" }],
      balances: [
        { wallet_id: "wallet-1", month: "2026-01-01", balance_cents: 10000 },
        { wallet_id: "wallet-1", month: "2026-02-01", balance_cents: 11000 },
        { wallet_id: "wallet-1", month: "2026-03-01", balance_cents: 12000 },
        { wallet_id: "wallet-1", month: "2026-04-01", balance_cents: 13000 },
        { wallet_id: "wallet-1", month: "2026-05-01", balance_cents: 14000 },
      ],
      stats: [],
    });
    mockedCreateServiceRoleClient.mockReturnValue(serviceRole.client as never);

    const response = await POST(
      createRequest(validBody({ horizon: 999 })) as never,
    );
    const body = await response.json();
    const lowResponse = await POST(
      createRequest(validBody({ horizon: -5 })) as never,
    );
    const lowBody = await lowResponse.json();

    expect(body.forecast).toHaveLength(48);
    expect(lowBody.forecast).toHaveLength(1);
  });
});
