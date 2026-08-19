"use client";

import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SidebarMenuAction } from "@/components/ui/sidebar";
import { useWallets } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import type { PlaidTransactionsResponse } from "@/utils/plaid/types";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
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

interface PlaidSyncMenuActionProps {
  walletId?: string;
}

export function PlaidSyncMenuAction({ walletId }: PlaidSyncMenuActionProps) {
  const [wallets] = useWallets();
  const queryClient = useQueryClient();
  const plaidWallets = wallets.filter(
    (wallet) =>
      (!walletId || wallet.id === walletId) &&
      wallet.plaid_account_id &&
      wallet.plaid_sync_enabled &&
      wallet.plaid_sync_start_at,
  );

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

  if (plaidWallets.length === 0) return null;

  const label =
    plaidWallets.length === 1
      ? `Sync ${plaidWallets[0].name}`
      : `Sync ${plaidWallets.length} Plaid wallets`;

  return (
    <SidebarMenuAction
      aria-label={label}
      title={label}
      disabled={syncMutation.isPending}
      className="pointer-events-none opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover/menu-item:pointer-events-auto group-hover/menu-item:translate-x-0 group-hover/menu-item:opacity-100 md:translate-x-1"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        syncMutation.mutate();
      }}
    >
      <RefreshCcw className={cn(syncMutation.isPending && "animate-spin")} />
    </SidebarMenuAction>
  );
}
