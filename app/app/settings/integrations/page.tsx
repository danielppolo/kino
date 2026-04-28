"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Landmark, Link2, RefreshCcw, Unplug } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import TransactionListPreview from "@/app/app/settings/wallets/[walletId]/(components)/transaction-list-preview";
import EmptyState from "@/components/shared/empty-state";
import PageHeader from "@/components/shared/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import {
  PlaidPreviewAccount,
  PlaidPreviewResponse,
  PlaidTransactionsResponse,
} from "@/utils/plaid/types";
import { Database } from "@/utils/supabase/database.types";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

function toLocalDateTimeInputValue(isoValue: string | null | undefined) {
  if (!isoValue) return "";

  const date = new Date(isoValue);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function fromLocalDateTimeInputValue(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

async function requestJson<T>(
  url: string,
  method: "DELETE" | "PATCH" | "POST",
  body: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(json.error ?? "Request failed");
  }

  return json;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [wallets] = useWallets();
  const bankWallets = useMemo(
    () => wallets.filter((wallet) => wallet.wallet_type === "bank_account"),
    [wallets],
  );
  const linkedWallets = useMemo(
    () => bankWallets.filter((wallet) => wallet.plaid_account_id),
    [bankWallets],
  );
  const walletById = useMemo(
    () => new Map(bankWallets.map((wallet) => [wallet.id, wallet])),
    [bankWallets],
  );
  const linkedWalletByPlaidAccountId = useMemo(
    () =>
      new Map(
        linkedWallets
          .filter((wallet) => wallet.plaid_account_id)
          .map((wallet) => [wallet.plaid_account_id as string, wallet]),
      ),
    [linkedWallets],
  );

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [shouldOpenLink, setShouldOpenLink] = useState(false);
  const [previewAccounts, setPreviewAccounts] = useState<PlaidPreviewAccount[]>(
    [],
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [syncStartAt, setSyncStartAt] = useState("");
  const [lastSyncResult, setLastSyncResult] =
    useState<PlaidTransactionsResponse | null>(null);
  const [disconnectWalletId, setDisconnectWalletId] = useState<string | null>(
    null,
  );

  const selectedAccount =
    previewAccounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedWallet =
    (selectedWalletId ? walletById.get(selectedWalletId) : null) ?? null;
  const disconnectWallet =
    (disconnectWalletId ? walletById.get(disconnectWalletId) : null) ?? null;

  useEffect(() => {
    if (previewAccounts.length === 0) return;

    setSelectedAccountId((current) =>
      previewAccounts.some((account) => account.id === current)
        ? current
        : (previewAccounts[0]?.id ?? ""),
    );
  }, [previewAccounts]);

  useEffect(() => {
    if (!selectedWallet) return;

    setSyncStartAt(
      toLocalDateTimeInputValue(
        selectedWallet.plaid_sync_start_at ?? new Date().toISOString(),
      ),
    );
  }, [selectedWallet]);

  const linkTokenMutation = useMutation({
    mutationFn: async () =>
      requestJson<{ linkToken: string }>("/api/plaid/link-token", "POST", {}),
    onSuccess: ({ linkToken: nextLinkToken }) => {
      setLinkToken(nextLinkToken);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create Plaid link token",
      );
      setShouldOpenLink(false);
    },
  });

  const previewMutation = useMutation({
    mutationFn: async ({
      institutionName,
      publicToken,
    }: {
      institutionName: string | null;
      publicToken: string;
    }) =>
      requestJson<PlaidPreviewResponse>("/api/plaid/preview", "POST", {
        institutionName,
        publicToken,
      }),
    onSuccess: ({ accounts }) => {
      setPreviewAccounts(accounts);
      setSelectedWalletId("");
      setSyncStartAt("");
      setLastSyncResult(null);
      toast.success("Plaid account connected");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load Plaid account previews",
      );
    },
  });

  const connectMutation = useMutation<
    PlaidTransactionsResponse,
    Error,
    {
      accountId: string;
      institutionName: string | null;
      sessionToken: string;
      walletId: string;
    }
  >({
    mutationFn: async ({
      accountId,
      institutionName,
      sessionToken,
      walletId,
    }: {
      accountId: string;
      institutionName: string | null;
      sessionToken: string;
      walletId: string;
    }) => {
      const isoSyncStartAt = fromLocalDateTimeInputValue(syncStartAt);
      if (!isoSyncStartAt) {
        throw new Error("Select a start datetime");
      }

      return requestJson<PlaidTransactionsResponse>(
        "/api/plaid/connect",
        "POST",
        {
          accountId,
          institutionName,
          plaidSyncStartAt: isoSyncStartAt,
          sessionToken,
          walletId,
        },
      );
    },
    onSuccess: async (result, variables) => {
      setLastSyncResult(result);
      setPreviewAccounts([]);
      setSelectedAccountId("");
      setSelectedWalletId(variables.walletId);
      await invalidateWorkspaceQueries(queryClient);
      toast.success(
        result.importedCount > 0
          ? `${result.importedCount} transactions imported`
          : "Plaid account linked",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to connect bank account to wallet",
      );
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async ({
      plaidSyncStartAt,
      walletId,
    }: {
      plaidSyncStartAt: string;
      walletId: string;
    }) =>
      requestJson<PlaidTransactionsResponse>(
        "/api/plaid/transactions",
        "POST",
        {
          plaidSyncStartAt,
          walletId,
        },
      ),
    onSuccess: async (result) => {
      setLastSyncResult(result);
      await invalidateWorkspaceQueries(queryClient);
      toast.success(
        result.importedCount > 0
          ? `${result.importedCount} transactions imported`
          : "Transactions refreshed",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to refresh transactions",
      );
    },
  });

  const syncStatusMutation = useMutation({
    mutationFn: async ({
      enabled,
      walletId,
    }: {
      enabled: boolean;
      walletId: string;
    }) =>
      requestJson<{ wallet: WalletRow }>("/api/plaid/connection", "PATCH", {
        enabled,
        walletId,
      }),
    onSuccess: async (_result, variables) => {
      await invalidateWorkspaceQueries(queryClient);
      toast.success(
        variables.enabled ? "Plaid sync resumed" : "Plaid sync paused",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update Plaid sync status",
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async ({ walletId }: { walletId: string }) =>
      requestJson<{ wallet: WalletRow }>("/api/plaid/connection", "DELETE", {
        walletId,
      }),
    onSuccess: async () => {
      setDisconnectWalletId(null);
      setLastSyncResult(null);
      await invalidateWorkspaceQueries(queryClient);
      toast.success("Plaid disconnected from wallet");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to disconnect Plaid account",
      );
    },
  });

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onExit: () => {
      setShouldOpenLink(false);
    },
    onSuccess: (publicToken, metadata) => {
      previewMutation.mutate({
        institutionName: metadata.institution?.name ?? null,
        publicToken,
      });
    },
  });

  useEffect(() => {
    if (!shouldOpenLink || !ready || !linkToken) return;

    open();
    setShouldOpenLink(false);
  }, [linkToken, open, ready, shouldOpenLink]);

  const handleStartLink = () => {
    setShouldOpenLink(true);
    linkTokenMutation.mutate();
  };

  const handleRefreshWallet = (wallet: WalletRow) => {
    if (!wallet.plaid_sync_start_at) {
      toast.error("Set a Plaid sync start datetime before refreshing");
      return;
    }

    refreshMutation.mutate({
      plaidSyncStartAt: wallet.plaid_sync_start_at,
      walletId: wallet.id,
    });
  };

  const isOpeningLink =
    linkTokenMutation.isPending || previewMutation.isPending;
  const isConnecting = connectMutation.isPending;
  const maxDateTime = toLocalDateTimeInputValue(new Date().toISOString());

  if (bankWallets.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader>
          <div className="flex items-center gap-2">
            <Landmark className="size-4" />
            <h2 className="text-sm font-semibold">Integrations</h2>
          </div>
        </PageHeader>

        <div className="flex-1">
          <EmptyState
            title="No bank wallets found"
            description="Create a bank account wallet first, then return here to link Plaid."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Landmark className="size-4" />
          <h2 className="text-sm font-semibold">Integrations</h2>
        </div>
      </PageHeader>

      <div className="overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Plaid</h1>
              <Text muted className="text-sm">
                Connect Plaid once, inspect returned bank accounts, then map the
                correct account to a wallet. Linked wallets can be paused,
                resumed, refreshed, or disconnected from here.
              </Text>
            </div>
            <Separator />
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Connect Plaid</h2>
                <Text muted className="text-sm">
                  Start a Plaid session to load the bank accounts available for
                  linking.
                </Text>
              </div>
              <Button onClick={handleStartLink} disabled={isOpeningLink}>
                {isOpeningLink ? "Opening Plaid..." : "Connect Plaid account"}
              </Button>
            </div>
          </section>

          {linkedWallets.length > 0 ? (
            <>
              <Separator />
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Connected wallets</h2>
                  <Text muted className="text-sm">
                    Manage sync state for wallets already linked to Plaid.
                  </Text>
                </div>

                <div className="space-y-4">
                  {linkedWallets.map((wallet) => {
                    const isUpdatingStatus =
                      syncStatusMutation.isPending &&
                      syncStatusMutation.variables?.walletId === wallet.id;
                    const isDisconnecting =
                      disconnectMutation.isPending &&
                      disconnectMutation.variables?.walletId === wallet.id;
                    const isRefreshing =
                      refreshMutation.isPending &&
                      refreshMutation.variables?.walletId === wallet.id;

                    return (
                      <section
                        key={wallet.id}
                        className="border-border/70 space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold">
                                {wallet.name}
                              </h3>
                              <Badge
                                variant={
                                  wallet.plaid_sync_enabled
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {wallet.plaid_sync_enabled
                                  ? "Active"
                                  : "Paused"}
                              </Badge>
                            </div>
                            <Text muted className="text-sm">
                              {wallet.plaid_institution_name || "Institution"} ·{" "}
                              {wallet.plaid_account_name || "Account"}
                              {wallet.plaid_account_mask
                                ? ` •••• ${wallet.plaid_account_mask}`
                                : ""}
                            </Text>
                            <Text muted className="text-xs">
                              Import starts{" "}
                              {wallet.plaid_sync_start_at
                                ? format(
                                    new Date(wallet.plaid_sync_start_at),
                                    "PPp",
                                  )
                                : "-"}
                            </Text>
                            <Text muted className="text-xs">
                              Last refreshed{" "}
                              {wallet.plaid_last_refreshed_at
                                ? format(
                                    new Date(wallet.plaid_last_refreshed_at),
                                    "PPp",
                                  )
                                : "-"}
                            </Text>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={wallet.plaid_sync_enabled}
                                disabled={isUpdatingStatus}
                                onCheckedChange={(checked) => {
                                  syncStatusMutation.mutate({
                                    enabled: checked,
                                    walletId: wallet.id,
                                  });
                                }}
                                aria-label={`Toggle Plaid sync for ${wallet.name}`}
                              />
                              <Text muted className="text-sm">
                                {wallet.plaid_sync_enabled
                                  ? "Active"
                                  : "Paused"}
                              </Text>
                            </div>

                            <Button
                              variant="outline"
                              onClick={() => handleRefreshWallet(wallet)}
                              disabled={
                                isRefreshing || !wallet.plaid_sync_enabled
                              }
                            >
                              <RefreshCcw className="mr-2 size-4" />
                              {isRefreshing ? "Refreshing..." : "Refresh"}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => setDisconnectWalletId(wallet.id)}
                              disabled={isDisconnecting}
                            >
                              <Unplug className="mr-2 size-4" />
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}

          {previewAccounts.length > 0 ? (
            <>
              <Separator />
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Select bank account</h2>
                  <Text muted className="text-sm">
                    Review the preview for each returned account so you can map
                    the right bank account to the right wallet.
                  </Text>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {previewAccounts.map((account) => {
                    const linkedWallet = linkedWalletByPlaidAccountId.get(
                      account.id,
                    );
                    const isSelected = account.id === selectedAccountId;

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setSelectedAccountId(account.id)}
                        className={`space-y-4 rounded-lg border p-4 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Text strong>
                                {account.name || "Account"}
                                {account.mask ? ` •••• ${account.mask}` : ""}
                              </Text>
                              {isSelected ? (
                                <Badge variant="secondary">Selected</Badge>
                              ) : null}
                            </div>
                            <Text muted className="text-xs">
                              {account.institution_name || "Linked institution"}
                            </Text>
                          </div>

                          {linkedWallet ? (
                            <Badge variant="outline">
                              Linked to {linkedWallet.name}
                            </Badge>
                          ) : null}
                        </div>

                        {account.transactions.length > 0 ? (
                          <TransactionListPreview
                            transactions={account.transactions}
                          />
                        ) : (
                          <div className="rounded-md border border-dashed p-4">
                            <Text muted className="text-sm">
                              No transactions available for preview.
                            </Text>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}

          {selectedAccount ? (
            <>
              <Separator />
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Connect to wallet</h2>
                  <Text muted className="text-sm">
                    Link the selected Plaid account to exactly one wallet and
                    define when imports should begin.
                  </Text>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">Target wallet</h3>
                    <Select
                      value={selectedWalletId}
                      onValueChange={setSelectedWalletId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankWallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.name}
                            {wallet.plaid_account_id ? " (linked)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </section>

                  <section className="space-y-2 rounded-lg border border-dashed p-4">
                    <h3 className="text-sm font-medium">
                      Selected bank account
                    </h3>
                    <Text muted className="text-sm">
                      {selectedAccount.name || "Account"}
                      {selectedAccount.mask
                        ? ` •••• ${selectedAccount.mask}`
                        : ""}
                    </Text>
                    <Text muted className="text-sm">
                      {selectedAccount.institution_name || "Linked institution"}
                    </Text>
                  </section>
                </div>

                {selectedWallet ? (
                  <section className="border-border/70 space-y-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">
                        Import start datetime
                      </h3>
                      <Text muted className="text-sm">
                        Transactions on or after this datetime will be fetched
                        and stored in{" "}
                        <span className="font-medium">
                          {selectedWallet.name}
                        </span>
                        .
                      </Text>
                    </div>

                    <div className="max-w-sm space-y-2">
                      <Input
                        type="datetime-local"
                        value={syncStartAt}
                        onChange={(event) => setSyncStartAt(event.target.value)}
                        max={maxDateTime}
                      />
                    </div>

                    <Button
                      onClick={() =>
                        connectMutation.mutate({
                          accountId: selectedAccount.id,
                          institutionName: selectedAccount.institution_name,
                          sessionToken: selectedAccount.session_token,
                          walletId: selectedWallet.id,
                        })
                      }
                      disabled={isConnecting || !syncStartAt}
                    >
                      <Link2 className="mr-2 size-4" />
                      {isConnecting
                        ? "Connecting account..."
                        : "Connect account to wallet"}
                    </Button>
                  </section>
                ) : null}
              </section>
            </>
          ) : null}

          {lastSyncResult ? (
            <>
              <Separator />
              <section className="space-y-2">
                <h2 className="text-lg font-semibold">Last import</h2>
                <Text muted className="text-sm">
                  {lastSyncResult.importedCount > 0
                    ? `${lastSyncResult.importedCount} transactions imported.`
                    : "No new transactions were imported."}
                </Text>
                <Text muted className="text-sm">
                  Last refreshed{" "}
                  {lastSyncResult.connection.plaid_last_refreshed_at
                    ? format(
                        new Date(
                          lastSyncResult.connection.plaid_last_refreshed_at,
                        ),
                        "PPp",
                      )
                    : "-"}
                </Text>
              </section>
            </>
          ) : null}
        </div>
      </div>

      <AlertDialog
        open={!!disconnectWalletId}
        onOpenChange={(open) => {
          if (!open) {
            setDisconnectWalletId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Plaid from wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectWallet
                ? `This will disconnect ${disconnectWallet.name} from Plaid and stop future syncs. Imported transactions already stored in the wallet will remain.`
                : "This will disconnect the wallet from Plaid and stop future syncs."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!disconnectWalletId) return;
                disconnectMutation.mutate({ walletId: disconnectWalletId });
              }}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
