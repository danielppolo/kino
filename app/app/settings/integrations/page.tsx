"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Landmark,
  Link2,
  MoreHorizontal,
  RefreshCcw,
  Unplug,
} from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import TransactionListPreview from "@/app/app/settings/wallets/[walletId]/(components)/transaction-list-preview";
import EmptyState from "@/components/shared/empty-state";
import WalletPicker from "@/components/shared/wallet-picker";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
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
      <div className="h-full overflow-y-auto px-4 py-6">
        <div className="max-w-3xl space-y-3">
          <div>
            <h2 className="text-base font-semibold">Banking</h2>
            <p className="text-muted-foreground text-sm">
              Connect external bank accounts to wallets in this workspace.
            </p>
          </div>
          <EmptyState
            title="No bank wallets found"
            description="Create a bank account wallet first, then return here to link Plaid."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="max-w-3xl space-y-10">
        <section aria-labelledby="banking-integrations" className="space-y-3">
          <div>
            <h2 id="banking-integrations" className="text-base font-semibold">
              Banking
            </h2>
            <p className="text-muted-foreground text-sm">
              Connect external bank accounts to wallets in this workspace.
            </p>
          </div>

          <ItemGroup>
            <Item role="listitem" size="sm">
              <ItemMedia variant="icon">
                <Landmark aria-hidden="true" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Plaid</ItemTitle>
                <ItemDescription>
                  Connect an institution, inspect its accounts, and choose the
                  wallet where transactions should be imported.
                </ItemDescription>
              </ItemContent>
              <ItemActions className="shrink-0">
                <Button
                  size="sm"
                  onClick={handleStartLink}
                  disabled={isOpeningLink}
                >
                  {isOpeningLink ? "Opening Plaid…" : "Connect"}
                </Button>
              </ItemActions>
            </Item>
          </ItemGroup>
        </section>

        {linkedWallets.length > 0 ? (
          <section aria-labelledby="connected-wallets" className="space-y-3">
            <div>
              <h2 id="connected-wallets" className="text-base font-semibold">
                Connected Wallets
              </h2>
              <p className="text-muted-foreground text-sm">
                Manage transaction sync for wallets connected through Plaid.
              </p>
            </div>

            <ItemGroup>
              {linkedWallets.map((wallet, index) => {
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
                  <div key={wallet.id} role="listitem">
                    {index > 0 ? <ItemSeparator /> : null}
                    <Item size="sm">
                      <ItemContent>
                        <ItemTitle>
                          {wallet.name}
                          <Badge
                            variant={
                              wallet.plaid_sync_enabled
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {wallet.plaid_sync_enabled ? "Active" : "Paused"}
                          </Badge>
                        </ItemTitle>
                        <ItemDescription>
                          {wallet.plaid_institution_name || "Institution"} ·{" "}
                          {wallet.plaid_account_name || "Account"}
                          {wallet.plaid_account_mask
                            ? ` •••• ${wallet.plaid_account_mask}`
                            : ""}
                        </ItemDescription>
                        <p className="text-muted-foreground text-xs">
                          Import starts{" "}
                          {wallet.plaid_sync_start_at
                            ? format(
                                new Date(wallet.plaid_sync_start_at),
                                "PPp",
                              )
                            : "—"}
                          {" · "}Last refreshed{" "}
                          {wallet.plaid_last_refreshed_at
                            ? format(
                                new Date(wallet.plaid_last_refreshed_at),
                                "PPp",
                              )
                            : "—"}
                        </p>
                      </ItemContent>
                      <ItemActions className="shrink-0 flex-wrap justify-end">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`More Plaid actions for ${wallet.name}`}
                            >
                              <MoreHorizontal
                                aria-hidden="true"
                                className="size-4"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={
                                isRefreshing || !wallet.plaid_sync_enabled
                              }
                              onSelect={() => handleRefreshWallet(wallet)}
                            >
                              <RefreshCcw
                                aria-hidden="true"
                                className="mr-2 size-4"
                              />
                              {isRefreshing ? "Refreshing…" : "Refresh"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isDisconnecting}
                              onSelect={() => setDisconnectWalletId(wallet.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Unplug
                                aria-hidden="true"
                                className="mr-2 size-4"
                              />
                              Disconnect
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ItemActions>
                    </Item>
                  </div>
                );
              })}
            </ItemGroup>
          </section>
        ) : null}

        {previewAccounts.length > 0 ? (
          <section
            aria-labelledby="bank-account-selection"
            className="space-y-3"
          >
            <div>
              <h2
                id="bank-account-selection"
                className="text-base font-semibold"
              >
                Select Bank Account
              </h2>
              <p className="text-muted-foreground text-sm">
                Review each returned account before mapping it to a wallet.
              </p>
            </div>

            <ItemGroup>
              {previewAccounts.map((account, index) => {
                const linkedWallet = linkedWalletByPlaidAccountId.get(
                  account.id,
                );
                const isSelected = account.id === selectedAccountId;

                return (
                  <div key={account.id} role="listitem">
                    {index > 0 ? <ItemSeparator /> : null}
                    <Item
                      asChild
                      size="sm"
                      variant={isSelected ? "muted" : "default"}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAccountId(account.id)}
                        className="w-full text-left"
                      >
                        <ItemContent>
                          <ItemTitle>
                            {account.name || "Account"}
                            {account.mask ? ` •••• ${account.mask}` : ""}
                          </ItemTitle>
                          <ItemDescription>
                            {account.institution_name || "Linked institution"}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          {isSelected ? (
                            <Badge variant="secondary">Selected</Badge>
                          ) : null}
                          {linkedWallet ? (
                            <Badge variant="outline">
                              Linked to {linkedWallet.name}
                            </Badge>
                          ) : null}
                        </ItemActions>
                        <ItemFooter>
                          {account.transactions.length > 0 ? (
                            <TransactionListPreview
                              transactions={account.transactions}
                            />
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              No transactions available for preview.
                            </p>
                          )}
                        </ItemFooter>
                      </button>
                    </Item>
                  </div>
                );
              })}
            </ItemGroup>
          </section>
        ) : null}

        {selectedAccount ? (
          <section aria-labelledby="wallet-mapping" className="space-y-3">
            <div>
              <h2 id="wallet-mapping" className="text-base font-semibold">
                Wallet Mapping
              </h2>
              <p className="text-muted-foreground text-sm">
                Choose a wallet and define when transaction imports should
                begin.
              </p>
            </div>

            <ItemGroup>
              <Item role="listitem" size="sm">
                <ItemContent>
                  <ItemTitle>Target Wallet</ItemTitle>
                  <ItemDescription>
                    Select where imported transactions should be stored.
                  </ItemDescription>
                </ItemContent>
                <ItemActions className="w-64 shrink-0">
                  <WalletPicker
                    walletType="bank_account"
                    value={selectedWalletId}
                    onChange={setSelectedWalletId}
                    placeholder="Select a wallet"
                    className="w-full"
                  />
                </ItemActions>
              </Item>
              <ItemSeparator />
              <Item role="listitem" size="sm">
                <ItemContent>
                  <ItemTitle>Selected Bank Account</ItemTitle>
                  <ItemDescription>
                    {selectedAccount.name || "Account"}
                    {selectedAccount.mask
                      ? ` •••• ${selectedAccount.mask}`
                      : ""}
                    {" · "}
                    {selectedAccount.institution_name || "Linked institution"}
                  </ItemDescription>
                </ItemContent>
              </Item>

              {selectedWallet ? (
                <>
                  <ItemSeparator />
                  <Item role="listitem" size="sm">
                    <ItemContent>
                      <ItemTitle>Import Start</ItemTitle>
                      <ItemDescription>
                        Fetch transactions on or after this date for{" "}
                        {selectedWallet.name}.
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="shrink-0 flex-wrap justify-end">
                      <Input
                        type="datetime-local"
                        aria-label="Import start date and time"
                        value={syncStartAt}
                        onChange={(event) => setSyncStartAt(event.target.value)}
                        max={maxDateTime}
                        className="w-56"
                      />
                      <Button
                        size="sm"
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
                        <Link2 aria-hidden="true" className="size-4" />
                        {isConnecting ? "Connecting…" : "Connect"}
                      </Button>
                    </ItemActions>
                  </Item>
                </>
              ) : null}
            </ItemGroup>
          </section>
        ) : null}

        {lastSyncResult ? (
          <section aria-labelledby="last-import" className="space-y-3">
            <h2 id="last-import" className="text-base font-semibold">
              Last Import
            </h2>
            <ItemGroup>
              <Item role="listitem" size="sm">
                <ItemContent>
                  <ItemTitle>Import Result</ItemTitle>
                  <ItemDescription>
                    {lastSyncResult.importedCount > 0
                      ? `${lastSyncResult.importedCount} transactions imported.`
                      : "No new transactions were imported."}
                    {" Last refreshed "}
                    {lastSyncResult.connection.plaid_last_refreshed_at
                      ? format(
                          new Date(
                            lastSyncResult.connection.plaid_last_refreshed_at,
                          ),
                          "PPp",
                        )
                      : "—"}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </ItemGroup>
          </section>
        ) : null}
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
