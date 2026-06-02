import type { User } from "@supabase/supabase-js";

import type { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

export type AppRole = "owner" | "editor" | "reader";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type UserPreferences = Database["public"]["Tables"]["user_preferences"]["Row"];
type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
type WorkspaceMembership = WorkspaceMember & {
  workspaces: Workspace | null;
};

type RoleRequirement = AppRole | AppRole[];

const roleRank: Record<AppRole, number> = {
  reader: 0,
  editor: 1,
  owner: 2,
};

export class AuthRequiredError extends Error {
  status = 401 as const;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ForbiddenError extends Error {
  status = 403 as const;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  status = 404 as const;

  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

async function getClient(client?: SupabaseServerClient) {
  return client ?? (await createClient());
}

function isAppRole(role: string): role is AppRole {
  return role === "owner" || role === "editor" || role === "reader";
}

function hasRequiredRole(role: string, minRole: RoleRequirement = "reader") {
  if (!isAppRole(role)) return false;

  const requiredRoles = Array.isArray(minRole) ? minRole : [minRole];
  return requiredRoles.some(
    (requiredRole) => roleRank[role] >= roleRank[requiredRole],
  );
}

function requireWorkspaceRelation(
  membership: WorkspaceMembership | null | undefined,
) {
  if (!membership?.workspaces) {
    throw new ForbiddenError("Workspace access required");
  }

  return {
    membership,
    workspace: membership.workspaces,
  };
}

export async function requireUser(client?: SupabaseServerClient): Promise<{
  supabase: SupabaseServerClient;
  user: User;
}> {
  const supabase = await getClient(client);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthRequiredError();
  }

  return { supabase, user };
}

export async function requireAppUser(client?: SupabaseServerClient): Promise<{
  preferences: UserPreferences | null;
  supabase: SupabaseServerClient;
  user: User;
}> {
  const { supabase, user } = await requireUser(client);
  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return { preferences, supabase, user };
}

export async function getActiveWorkspace(
  client?: SupabaseServerClient,
): Promise<{
  membership: WorkspaceMembership;
  preferences: UserPreferences | null;
  supabase: SupabaseServerClient;
  user: User;
  workspace: Workspace;
}> {
  const { preferences, supabase, user } = await requireAppUser(client);
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, workspaces(*)")
    .eq("user_id", user.id);

  if (error) throw error;

  const memberships = (data ?? []) as WorkspaceMembership[];
  const membership =
    memberships.find(
      (row) => row.workspace_id === preferences?.active_workspace_id,
    ) ?? memberships[0];
  const resolved = requireWorkspaceRelation(membership);

  return {
    membership: resolved.membership,
    preferences,
    supabase,
    user,
    workspace: resolved.workspace,
  };
}

export async function requireWorkspaceAccess({
  client,
  minRole = "reader",
  workspaceId,
}: {
  client?: SupabaseServerClient;
  minRole?: RoleRequirement;
  workspaceId?: string;
}): Promise<{
  membership: WorkspaceMembership;
  supabase: SupabaseServerClient;
  user: User;
  workspace: Workspace;
}> {
  if (!workspaceId) {
    const activeWorkspace = await getActiveWorkspace(client);

    if (!hasRequiredRole(activeWorkspace.membership.role, minRole)) {
      throw new ForbiddenError("Insufficient workspace role");
    }

    return activeWorkspace;
  }

  const { supabase, user } = await requireUser(client);
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, workspaces(*)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  const { membership, workspace } = requireWorkspaceRelation(
    data as WorkspaceMembership | null,
  );

  if (!hasRequiredRole(membership.role, minRole)) {
    throw new ForbiddenError("Insufficient workspace role");
  }

  return { membership, supabase, user, workspace };
}

export async function requireWalletAccess({
  client,
  minRole = "reader",
  requireActiveWorkspace = false,
  walletId,
}: {
  client?: SupabaseServerClient;
  minRole?: RoleRequirement;
  requireActiveWorkspace?: boolean;
  walletId: string;
}): Promise<{
  membership: WorkspaceMembership;
  supabase: SupabaseServerClient;
  user: User;
  wallet: Wallet;
  workspace: Workspace;
}> {
  const { supabase, user } = await requireUser(client);
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .maybeSingle();

  if (error) throw error;
  if (!wallet) {
    throw new NotFoundError("Wallet not found");
  }

  const access = await requireWorkspaceAccess({
    client: supabase,
    minRole,
    workspaceId: wallet.workspace_id,
  });

  if (requireActiveWorkspace) {
    const activeWorkspace = await getActiveWorkspace(supabase);

    if (activeWorkspace.workspace.id !== wallet.workspace_id) {
      throw new ForbiddenError("Wallet is outside the active workspace");
    }
  }

  return {
    membership: access.membership,
    supabase,
    user,
    wallet,
    workspace: access.workspace,
  };
}

export async function resolveWalletScope({
  client,
  requireActiveWorkspace = false,
  walletId,
  workspaceId,
}: {
  client?: SupabaseServerClient;
  requireActiveWorkspace?: boolean;
  walletId?: string;
  workspaceId?: string;
}): Promise<{
  membership: WorkspaceMembership;
  supabase: SupabaseServerClient;
  user: User;
  walletId: string | undefined;
  walletIds: string[];
  workspace: Workspace;
}> {
  if (walletId) {
    const access = await requireWalletAccess({
      client,
      requireActiveWorkspace,
      walletId,
    });

    return {
      membership: access.membership,
      supabase: access.supabase,
      user: access.user,
      walletId,
      walletIds: [walletId],
      workspace: access.workspace,
    };
  }

  const access = await requireWorkspaceAccess({
    client,
    workspaceId,
  });

  if (requireActiveWorkspace) {
    const activeWorkspace = await getActiveWorkspace(access.supabase);

    if (activeWorkspace.workspace.id !== access.workspace.id) {
      throw new ForbiddenError("Workspace is not active");
    }
  }

  const { data: wallets, error } = await access.supabase
    .from("wallets")
    .select("id")
    .eq("workspace_id", access.workspace.id);

  if (error) throw error;

  return {
    membership: access.membership,
    supabase: access.supabase,
    user: access.user,
    walletId: undefined,
    walletIds: ((wallets ?? []) as Array<Pick<Wallet, "id">>).map(
      (wallet) => wallet.id,
    ),
    workspace: access.workspace,
  };
}
