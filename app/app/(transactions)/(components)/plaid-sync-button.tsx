"use client";

import { useMemo } from "react";
import { RefreshCcw } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { TooltipButton } from "@/components/ui/tooltip-button";
import { useWallets } from "@/contexts/settings-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import type { PlaidTransactionsResponse } from "@/utils/plaid/types";
import type { Wallet } from "@/utils/supabase/types";

async function syncPlaidWallet(wallet: Wallet) {
  const response = await fetch("/api/plaid/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plaidSyncStartAt: wallet.plaid_sync_start_at,
      walletId: wallet.id,
    }),
  });

  const json = (await response.json()) as PlaidTransactionsResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(json.error ?? "Failed to sync Plaid transactions");
  }

  return json;
}

export function PlaidSyncButton() {
  const [wallets] = useWallets();
  const params = useParams<{ walletId?: string | string[] }>();
  const queryClient = useQueryClient();
  const routeWalletId = Array.isArray(params.walletId)
    ? params.walletId[0]
    : params.walletId;
  const plaidWallets = useMemo(() => {
    const linkedWallets = wallets.filter(
      (wallet) =>
        wallet.plaid_account_id &&
        wallet.plaid_sync_enabled &&
        wallet.plaid_sync_start_at,
    );

    if (!routeWalletId) return linkedWallets;

    return linkedWallets.filter((wallet) => wallet.id === routeWalletId);
  }, [routeWalletId, wallets]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(plaidWallets.map(syncPlaidWallet));
      return results.reduce((total, result) => total + result.importedCount, 0);
    },
    onSuccess: async (importedCount) => {
      await invalidateWorkspaceQueries(queryClient);
      toast.success(
        importedCount > 0
          ? `${importedCount} transactions imported`
          : "Plaid transactions synced",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to sync Plaid transactions",
      );
    },
  });

  if (plaidWallets.length === 0) {
    return null;
  }

  return (
    <TooltipButton
      variant="ghost"
      size="sm"
      tooltip={
        plaidWallets.length === 1
          ? `Sync ${plaidWallets[0].name}`
          : `Sync ${plaidWallets.length} Plaid wallets`
      }
      loading={syncMutation.isPending}
      disabled={syncMutation.isPending}
      onClick={() => syncMutation.mutate()}
    >
      <RefreshCcw className="h-4 w-4" />
    </TooltipButton>
  );
}
