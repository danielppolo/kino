import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AuthRequiredError,
  ForbiddenError,
  getActiveWorkspace,
  NotFoundError,
  requireAppUser,
  requireUser,
  requireWalletAccess,
  requireWorkspaceAccess,
  resolveWalletScope,
} from "@/utils/auth/server";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient,
}));

type AppRole = "owner" | "editor" | "reader";

type WorkspaceRow = {
  base_currency: string;
  id: string;
  name: string;
};

type MembershipRow = {
  id: string;
  role: AppRole;
  user_id: string;
  workspace_id: string;
  workspaces?: WorkspaceRow | null;
};

type PreferencesRow = {
  active_workspace_id: string | null;
  id: string;
  user_id: string;
};

type WalletRow = {
  id: string;
  workspace_id: string;
};

type QueryResult = {
  data:
    | MembershipRow[]
    | MembershipRow
    | PreferencesRow
    | WalletRow[]
    | WalletRow
    | null;
  error: Error | null;
};

type QueryMock = {
  eq: ReturnType<typeof vi.fn<(column: string, value: unknown) => QueryMock>>;
  maybeSingle: ReturnType<typeof vi.fn<() => Promise<QueryResult>>>;
  select: ReturnType<typeof vi.fn<(select?: string) => QueryMock>>;
  single: ReturnType<typeof vi.fn<() => Promise<QueryResult>>>;
  then: (resolve: (value: QueryResult) => void) => void;
};

function workspace(id: string): WorkspaceRow {
  return {
    base_currency: "USD",
    id,
    name: `${id} workspace`,
  };
}

function membership(
  workspaceId: string,
  role: AppRole = "reader",
  workspaces: WorkspaceRow | null = workspace(workspaceId),
): MembershipRow {
  return {
    id: `membership-${workspaceId}`,
    role,
    user_id: "user-id",
    workspace_id: workspaceId,
    workspaces,
  };
}

function createSupabaseMock({
  authError = null,
  memberships = [],
  preferences = {
    active_workspace_id: null,
    id: "preferences-id",
    user_id: "user-id",
  },
  user = { id: "user-id" },
  wallets = [],
}: {
  authError?: Error | null;
  memberships?: MembershipRow[];
  preferences?: PreferencesRow | null;
  user?: { id: string } | null;
  wallets?: WalletRow[];
} = {}) {
  const calls: Array<{
    filters: Array<[string, unknown]>;
    select?: string;
    table: string;
  }> = [];

  function from(table: string) {
    const call = {
      filters: [] as Array<[string, unknown]>,
      select: undefined as string | undefined,
      table,
    };
    calls.push(call);

    const query = {} as QueryMock;
    query.eq = vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value]);
      return query;
    });
    query.maybeSingle = vi.fn(async () => resolveSingle(table, call.filters));
    query.select = vi.fn((select?: string) => {
      call.select = select;
      return query;
    });
    query.single = vi.fn(async () => resolveSingle(table, call.filters));
    query.then = (resolve: (value: QueryResult) => void) => {
      resolve(resolveMany(table, call.filters));
    };

    return query;
  }

  function resolveSingle(table: string, filters: Array<[string, unknown]>) {
    if (table === "user_preferences") {
      return { data: preferences, error: null };
    }

    if (table === "wallets") {
      const id = filters.find(([column]) => column === "id")?.[1];
      return {
        data: wallets.find((wallet) => wallet.id === id) ?? null,
        error: null,
      };
    }

    if (table === "workspace_members") {
      const rows = filterMemberships(filters);
      return { data: rows[0] ?? null, error: null };
    }

    throw new Error(`Unexpected single table: ${table}`);
  }

  function resolveMany(table: string, filters: Array<[string, unknown]>) {
    if (table === "workspace_members") {
      return { data: filterMemberships(filters), error: null };
    }

    if (table === "wallets") {
      const workspaceId = filters.find(
        ([column]) => column === "workspace_id",
      )?.[1];
      return {
        data: wallets.filter((wallet) => wallet.workspace_id === workspaceId),
        error: null,
      };
    }

    throw new Error(`Unexpected many table: ${table}`);
  }

  function filterMemberships(filters: Array<[string, unknown]>) {
    return memberships.filter((row) =>
      filters.every(([column, value]) => {
        if (column === "user_id") return row.user_id === value;
        if (column === "workspace_id") return row.workspace_id === value;
        return true;
      }),
    );
  }

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user },
        error: authError,
      })),
    },
    from: vi.fn(from),
  };

  return { calls, client };
}

describe("auth server helpers", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("throws an AuthRequiredError with status 401 when auth has no user", async () => {
    const supabase = createSupabaseMock({ user: null });

    await expect(requireUser(supabase.client as never)).rejects.toMatchObject({
      status: 401,
    });
    await expect(requireUser(supabase.client as never)).rejects.toBeInstanceOf(
      AuthRequiredError,
    );
  });

  it("uses the provided client or creates one when no client is provided", async () => {
    const provided = createSupabaseMock();
    const created = createSupabaseMock();
    createClient.mockResolvedValue(created.client);

    await expect(requireUser(provided.client as never)).resolves.toMatchObject({
      supabase: provided.client,
      user: { id: "user-id" },
    });
    await expect(requireUser()).resolves.toMatchObject({
      supabase: created.client,
      user: { id: "user-id" },
    });
  });

  it("loads app user preferences with maybeSingle", async () => {
    const preferences = {
      active_workspace_id: "workspace-id",
      id: "preferences-id",
      user_id: "user-id",
    };
    const supabase = createSupabaseMock({ preferences });

    await expect(
      requireAppUser(supabase.client as never),
    ).resolves.toMatchObject({
      preferences,
      user: { id: "user-id" },
    });
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({
        filters: [["user_id", "user-id"]],
        table: "user_preferences",
      }),
    );
  });

  it("chooses the active workspace only when the user has membership", async () => {
    const supabase = createSupabaseMock({
      memberships: [
        membership("workspace-first", "reader"),
        membership("workspace-active", "editor"),
      ],
      preferences: {
        active_workspace_id: "workspace-active",
        id: "preferences-id",
        user_id: "user-id",
      },
    });

    await expect(
      getActiveWorkspace(supabase.client as never),
    ).resolves.toMatchObject({
      membership: { role: "editor", workspace_id: "workspace-active" },
      workspace: { id: "workspace-active" },
    });
  });

  it("falls back to the first membership when the preferred workspace is unavailable", async () => {
    const supabase = createSupabaseMock({
      memberships: [
        membership("workspace-first", "reader"),
        membership("workspace-second", "owner"),
      ],
      preferences: {
        active_workspace_id: "missing-workspace",
        id: "preferences-id",
        user_id: "user-id",
      },
    });

    await expect(
      getActiveWorkspace(supabase.client as never),
    ).resolves.toMatchObject({
      membership: { workspace_id: "workspace-first" },
      workspace: { id: "workspace-first" },
    });
  });

  it("throws ForbiddenError when no workspace membership or relation is available", async () => {
    const noMemberships = createSupabaseMock();
    const missingWorkspaceRelation = createSupabaseMock({
      memberships: [membership("workspace-id", "owner", null)],
    });

    await expect(
      getActiveWorkspace(noMemberships.client as never),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      getActiveWorkspace(missingWorkspaceRelation.client as never),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("enforces workspace role order and any-of role lists", async () => {
    const supabase = createSupabaseMock({
      memberships: [membership("workspace-id", "editor")],
    });

    await expect(
      requireWorkspaceAccess({
        client: supabase.client as never,
        minRole: "reader",
        workspaceId: "workspace-id",
      }),
    ).resolves.toMatchObject({
      membership: { role: "editor" },
      workspace: { id: "workspace-id" },
    });
    await expect(
      requireWorkspaceAccess({
        client: supabase.client as never,
        minRole: ["owner", "editor"],
        workspaceId: "workspace-id",
      }),
    ).resolves.toMatchObject({
      membership: { role: "editor" },
    });
    await expect(
      requireWorkspaceAccess({
        client: supabase.client as never,
        minRole: "owner",
        workspaceId: "workspace-id",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("validates wallet workspace membership and active-workspace restrictions", async () => {
    const supabase = createSupabaseMock({
      memberships: [
        membership("active-workspace", "owner"),
        membership("other-workspace", "reader"),
      ],
      preferences: {
        active_workspace_id: "active-workspace",
        id: "preferences-id",
        user_id: "user-id",
      },
      wallets: [
        { id: "wallet-active", workspace_id: "active-workspace" },
        { id: "wallet-other", workspace_id: "other-workspace" },
      ],
    });

    await expect(
      requireWalletAccess({
        client: supabase.client as never,
        minRole: "owner",
        walletId: "wallet-active",
      }),
    ).resolves.toMatchObject({
      wallet: { id: "wallet-active", workspace_id: "active-workspace" },
    });
    await expect(
      requireWalletAccess({
        client: supabase.client as never,
        requireActiveWorkspace: true,
        walletId: "wallet-other",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError for a missing wallet", async () => {
    const supabase = createSupabaseMock();

    await expect(
      requireWalletAccess({
        client: supabase.client as never,
        walletId: "missing-wallet",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("resolves wallet scope to one wallet or all wallets in the authorized workspace", async () => {
    const supabase = createSupabaseMock({
      memberships: [membership("workspace-id", "reader")],
      wallets: [
        { id: "wallet-a", workspace_id: "workspace-id" },
        { id: "wallet-b", workspace_id: "workspace-id" },
        { id: "wallet-other", workspace_id: "other-workspace" },
      ],
    });

    await expect(
      resolveWalletScope({
        client: supabase.client as never,
        walletId: "wallet-a",
      }),
    ).resolves.toMatchObject({
      walletId: "wallet-a",
      walletIds: ["wallet-a"],
    });
    await expect(
      resolveWalletScope({
        client: supabase.client as never,
        workspaceId: "workspace-id",
      }),
    ).resolves.toMatchObject({
      walletId: undefined,
      walletIds: ["wallet-a", "wallet-b"],
      workspace: { id: "workspace-id" },
    });
  });

  it("returns an empty wallet scope for an authorized workspace with no wallets", async () => {
    const supabase = createSupabaseMock({
      memberships: [membership("empty-workspace", "owner")],
      wallets: [{ id: "other-wallet", workspace_id: "other-workspace" }],
    });

    await expect(
      resolveWalletScope({
        client: supabase.client as never,
        workspaceId: "empty-workspace",
      }),
    ).resolves.toMatchObject({
      walletIds: [],
      workspace: { id: "empty-workspace" },
    });
  });
});
