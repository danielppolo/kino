"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Landmark, RefreshCcw } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import TransactionListPreview from "@/app/app/settings/wallets/[walletId]/(components)/transaction-list-preview";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import {
  PlaidTransactionsResponse,
  PlaidWalletConnection,
} from "@/utils/plaid/types";
import { Wallet } from "@/utils/supabase/types";

interface PendingPlaidLink {
  accounts: Array<{
    id: string;
    mask: string | null;
    name: string | null;
  }>;
  institutionName: string | null;
  publicToken: string;
}

function getWalletPlaidConnection(
  wallet: Wallet,
): PlaidWalletConnection | null {
  if (!wallet.plaid_account_id || !wallet.plaid_item_id) {
    return null;
  }

  return {
    plaid_account_id: wallet.plaid_account_id,
    plaid_account_mask: wallet.plaid_account_mask,
    plaid_account_name: wallet.plaid_account_name,
    plaid_institution_name: wallet.plaid_institution_name,
    plaid_item_id: wallet.plaid_item_id,
    plaid_last_refreshed_at: wallet.plaid_last_refreshed_at,
    plaid_sync_start_at: wallet.plaid_sync_start_at,
  };
}

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

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
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

export default function WalletPlaidSection({ wallet }: { wallet: Wallet }) {
  const queryClient = useQueryClient();
  const [wallets] = useWallets();
  const currentWallet = useMemo(
    () => wallets.find((candidate) => candidate.id === wallet.id) ?? wallet,
    [wallet, wallets],
  );
  const [connection, setConnection] = useState<PlaidWalletConnection | null>(
    () => getWalletPlaidConnection(currentWallet),
  );
  const [transactions, setTransactions] = useState<
    PlaidTransactionsResponse["transactions"]
  >([]);
  const [hasFetchedTransactions, setHasFetchedTransactions] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<PendingPlaidLink | null>(null);
  const [selectedPendingAccountId, setSelectedPendingAccountId] = useState("");
  const [shouldOpenLink, setShouldOpenLink] = useState(false);
  const [syncStartAt, setSyncStartAt] = useState(
    toLocalDateTimeInputValue(currentWallet.plaid_sync_start_at) ||
      toLocalDateTimeInputValue(new Date().toISOString()),
  );

  useEffect(() => {
    setConnection(getWalletPlaidConnection(currentWallet));
    setSyncStartAt(
      toLocalDateTimeInputValue(currentWallet.plaid_sync_start_at) ||
        toLocalDateTimeInputValue(new Date().toISOString()),
    );
    setPendingLink(null);
    setSelectedPendingAccountId("");
  }, [currentWallet]);

  const linkTokenMutation = useMutation({
    mutationFn: async () =>
      postJson<{ linkToken: string }>("/api/plaid/link-token", {
        walletId: wallet.id,
      }),
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

  const exchangeMutation = useMutation({
    mutationFn: async ({
      accountId,
      accountMask,
      accountName,
      institutionName,
      plaidSyncStartAt,
      publicToken,
    }: {
      accountId: string;
      accountMask: string | null;
      accountName: string | null;
      institutionName: string | null;
      plaidSyncStartAt: string;
      publicToken: string;
    }) =>
      postJson<PlaidTransactionsResponse>("/api/plaid/exchange", {
        accountId,
        accountMask,
        accountName,
        institutionName,
        plaidSyncStartAt,
        publicToken,
        walletId: wallet.id,
      }),
    onSuccess: async (result) => {
      setConnection(result.connection);
      setImportedCount(result.importedCount);
      setTransactions(result.transactions);
      setHasFetchedTransactions(true);
      setLinkToken(null);
      setPendingLink(null);
      setSelectedPendingAccountId("");
      await invalidateWorkspaceQueries(queryClient);
      toast.success(
        result.importedCount > 0
          ? `Bank account linked and ${result.importedCount} transactions imported`
          : "Bank account linked",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to link bank account",
      );
    },
  });

  const transactionsMutation = useMutation({
    mutationFn: async () =>
      postJson<PlaidTransactionsResponse>("/api/plaid/transactions", {
        plaidSyncStartAt: fromLocalDateTimeInputValue(syncStartAt),
        walletId: wallet.id,
      }),
    onSuccess: (result) => {
      setConnection(result.connection);
      setImportedCount(result.importedCount);
      setTransactions(result.transactions);
      setHasFetchedTransactions(true);
      toast.success(
        result.importedCount > 0
          ? `${result.importedCount} transactions imported`
          : "Transactions refreshed",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch transactions",
      );
    },
  });

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onExit: () => {
      setShouldOpenLink(false);
    },
    onSuccess: (publicToken, metadata) => {
      if (metadata.accounts.length === 0) {
        toast.error("No account was selected in Plaid");
        return;
      }
      const accounts = metadata.accounts.map((account) => ({
        id: account.id,
        mask: account.mask ?? null,
        name: account.name ?? null,
      }));
      setPendingLink({
        accounts,
        institutionName: metadata.institution?.name ?? null,
        publicToken,
      });
      setSelectedPendingAccountId(accounts[0]?.id ?? "");
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

  const handleConnectPendingAccount = () => {
    if (!pendingLink) return;

    const selectedAccount = pendingLink.accounts.find(
      (account) => account.id === selectedPendingAccountId,
    );

    const isoSyncStartAt = fromLocalDateTimeInputValue(syncStartAt);
    if (!selectedAccount || !isoSyncStartAt) {
      toast.error("Select an account and sync start datetime");
      return;
    }

    exchangeMutation.mutate({
      accountId: selectedAccount.id,
      accountMask: selectedAccount.mask,
      accountName: selectedAccount.name,
      institutionName: pendingLink.institutionName,
      plaidSyncStartAt: isoSyncStartAt,
      publicToken: pendingLink.publicToken,
    });
  };

  const isLinking = linkTokenMutation.isPending || exchangeMutation.isPending;
  const isRefreshing = transactionsMutation.isPending;
  const isBusy = isLinking || isRefreshing;
  const selectedPendingAccount =
    pendingLink?.accounts.find(
      (account) => account.id === selectedPendingAccountId,
    ) ?? null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="size-4" />
          Plaid
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Link a Plaid account to this wallet, then sync and store transactions
          from a chosen start datetime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <div className="rounded-md border p-3">
            <Text strong className="truncate">
              {connection.plaid_institution_name || "Linked institution"}
            </Text>
            <Text muted className="truncate">
              {connection.plaid_account_name || "Linked account"}
              {connection.plaid_account_mask
                ? ` •••• ${connection.plaid_account_mask}`
                : ""}
            </Text>
            {connection.plaid_last_refreshed_at ? (
              <Text muted className="mt-1 text-xs">
                Last refreshed{" "}
                {format(new Date(connection.plaid_last_refreshed_at), "PPp")}
              </Text>
            ) : null}
            {connection.plaid_sync_start_at ? (
              <Text muted className="mt-1 text-xs">
                Syncing from{" "}
                {format(new Date(connection.plaid_sync_start_at), "PPp")}
              </Text>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-3">
            <Text muted>
              No linked bank account yet. Link one, choose the account for this
              wallet, and set the auto-sync rules below.
            </Text>
          </div>
        )}

        <div className="space-y-2">
          <Text muted small>
            Start syncing from
          </Text>
          <Input
            type="datetime-local"
            value={syncStartAt}
            onChange={(event) => setSyncStartAt(event.target.value)}
            max={toLocalDateTimeInputValue(new Date().toISOString())}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleStartLink} disabled={isBusy}>
            {connection
              ? isLinking
                ? "Relinking..."
                : "Relink account"
              : isLinking
                ? "Opening Plaid..."
                : "Link bank account"}
          </Button>
          {connection ? (
            <Button
              variant="outline"
              onClick={() => transactionsMutation.mutate()}
              disabled={isBusy}
            >
              <RefreshCcw className="mr-2 size-4" />
              {isRefreshing ? "Refreshing..." : "Refresh transactions"}
            </Button>
          ) : null}
        </div>

        {pendingLink ? (
          <div className="space-y-3 rounded-md border p-3">
            <div>
              <Text strong>Choose account for wallet</Text>
              <Text muted className="text-xs">
                {pendingLink.institutionName || "Linked institution"}
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingLink.accounts.map((account) => (
                <Button
                  key={account.id}
                  variant={
                    account.id === selectedPendingAccountId
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedPendingAccountId(account.id)}
                >
                  {account.name || "Account"}
                  {account.mask ? ` •••• ${account.mask}` : ""}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleConnectPendingAccount}
                disabled={exchangeMutation.isPending || !selectedPendingAccount}
              >
                {exchangeMutation.isPending
                  ? "Connecting..."
                  : "Connect selected account"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingLink(null);
                  setSelectedPendingAccountId("");
                }}
                disabled={exchangeMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {hasFetchedTransactions ? (
          <div className="space-y-2">
            <Text muted className="text-xs">
              {importedCount > 0
                ? `${importedCount} new transactions imported on the last sync.`
                : "No new transactions were imported on the last sync."}
            </Text>
            {transactions.length > 0 ? (
              <TransactionListPreview transactions={transactions} />
            ) : (
              <div className="rounded-md border border-dashed p-3">
                <Text muted>
                  No transactions were returned for this account.
                </Text>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
