"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Landmark, Link2 } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import TransactionListPreview from "@/app/app/settings/wallets/[walletId]/(components)/transaction-list-preview";
import EmptyState from "@/components/shared/empty-state";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import {
  PlaidPreviewAccount,
  PlaidPreviewResponse,
  PlaidTransactionsResponse,
} from "@/utils/plaid/types";

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

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [wallets] = useWallets();
  const bankWallets = useMemo(
    () => wallets.filter((wallet) => wallet.wallet_type === "bank_account"),
    [wallets],
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

  const selectedAccount =
    previewAccounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedWallet =
    (selectedWalletId ? walletById.get(selectedWalletId) : null) ?? null;

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
      postJson<{ linkToken: string }>("/api/plaid/link-token", {}),
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
      postJson<PlaidPreviewResponse>("/api/plaid/preview", {
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

  const connectMutation = useMutation({
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

      return postJson<PlaidTransactionsResponse>("/api/plaid/connect", {
        accountId,
        institutionName,
        plaidSyncStartAt: isoSyncStartAt,
        sessionToken,
        walletId,
      });
    },
    onSuccess: async (
      result,
      variables: {
        accountId: string;
        institutionName: string | null;
        sessionToken: string;
        walletId: string;
      },
    ) => {
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

      <div className="overflow-auto p-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Plaid</CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect Plaid once, inspect each returned bank account, then map
              the correct account to a wallet and choose when imports should
              start.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Text strong>1. Connect Plaid account</Text>
                  <Text muted className="text-sm">
                    Start a new Plaid session to load the bank accounts
                    available for linking.
                  </Text>
                </div>
                <Button onClick={handleStartLink} disabled={isOpeningLink}>
                  {isOpeningLink ? "Opening Plaid..." : "Connect Plaid account"}
                </Button>
              </div>
            </div>

            {previewAccounts.length > 0 ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <Text strong>2. Select the bank account</Text>
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
              </div>
            ) : null}

            {selectedAccount ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <Text strong>3. Select the target wallet</Text>
                  <Text muted className="text-sm">
                    The selected bank account will sync into exactly one wallet.
                  </Text>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Text muted small>
                      Target wallet
                    </Text>
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
                  </div>

                  <div className="rounded-md border border-dashed p-4">
                    <Text muted className="text-sm">
                      Selected account:{" "}
                      <span className="text-foreground font-medium">
                        {selectedAccount.name || "Account"}
                        {selectedAccount.mask
                          ? ` •••• ${selectedAccount.mask}`
                          : ""}
                      </span>
                    </Text>
                    <Text muted className="mt-1 text-sm">
                      Institution:{" "}
                      {selectedAccount.institution_name || "Linked institution"}
                    </Text>
                  </div>
                </div>

                {selectedWallet ? (
                  <div className="bg-muted/30 space-y-4 rounded-lg p-4">
                    <div className="space-y-1">
                      <Text strong>4. Choose when imports should start</Text>
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
                      <Text muted small>
                        Start datetime
                      </Text>
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
                  </div>
                ) : null}
              </div>
            ) : null}

            {linkedWallets.length > 0 ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="space-y-1">
                  <Text strong>Existing linked wallets</Text>
                  <Text muted className="text-sm">
                    Wallets already connected to Plaid accounts.
                  </Text>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {linkedWallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="rounded-md border border-dashed p-4"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <Text strong>{wallet.name}</Text>
                      </div>
                      <Text muted className="mt-2 text-sm">
                        {wallet.plaid_institution_name || "Institution"} ·{" "}
                        {wallet.plaid_account_name || "Account"}
                        {wallet.plaid_account_mask
                          ? ` •••• ${wallet.plaid_account_mask}`
                          : ""}
                      </Text>
                      <Text muted className="mt-1 text-xs">
                        Import starts{" "}
                        {wallet.plaid_sync_start_at
                          ? format(new Date(wallet.plaid_sync_start_at), "PPp")
                          : "-"}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {lastSyncResult ? (
              <div className="rounded-lg border p-4">
                <Text strong>Last import</Text>
                <Text muted className="mt-2 text-sm">
                  {lastSyncResult.importedCount > 0
                    ? `${lastSyncResult.importedCount} transactions imported.`
                    : "No new transactions were imported."}
                </Text>
                <Text muted className="mt-1 text-sm">
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
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
