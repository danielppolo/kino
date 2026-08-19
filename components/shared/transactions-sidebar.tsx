"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { Bot, Home, Plus, X } from "lucide-react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PlaidSyncMenuAction } from "./plaid-sync-menu-action";
import SaveViewDialog from "./save-view-dialog";
import { SidebarWrapper } from "./sidebar-wrapper";
import { TransactionLink } from "./transaction-link";

import { AnimatedMoney } from "@/components/ui/animated-money";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useViews, useWallets } from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import { cn } from "@/lib/utils";
import { buildTransactionUrl } from "@/utils/build-transaction-url";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { sidebarBalanceKey } from "@/utils/sidebar-balance-snapshot";
import { deleteViews } from "@/utils/supabase/mutations";
import type { Wallet } from "@/utils/supabase/types";

interface WalletMenuItemProps {
  wallet: Wallet & { owed_cents: number };
  shortcut?: number;
  isActive: boolean;
  fromDate: string;
  toDate: string;
  displayBalance: number;
  workspaceId: string;
  isOwedReady: boolean;
}

function WalletMenuItem({
  wallet,
  shortcut,
  isActive,
  fromDate,
  toDate,
  displayBalance,
  workspaceId,
  isOwedReady,
}: WalletMenuItemProps) {
  const [hotkeyOpen, setHotkeyOpen] = useState(false);
  const canSync = Boolean(
    wallet.plaid_account_id &&
      wallet.plaid_sync_enabled &&
      wallet.plaid_sync_start_at,
  );
  const menuButton = (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      className={cn(
        canSync &&
          "pr-8 md:pr-2! md:group-focus-within/menu-item:pr-8! md:group-hover/menu-item:pr-8!",
      )}
      onMouseEnter={
        shortcut === undefined ? undefined : () => setHotkeyOpen(true)
      }
      onMouseLeave={
        shortcut === undefined ? undefined : () => setHotkeyOpen(false)
      }
      onFocus={shortcut === undefined ? undefined : () => setHotkeyOpen(true)}
      onBlur={shortcut === undefined ? undefined : () => setHotkeyOpen(false)}
    >
      <TransactionLink walletId={wallet.id} from={fromDate} to={toDate}>
        <span className="flex-1">{wallet.name}</span>
        <AnimatedMoney
          balanceKey={sidebarBalanceKey(workspaceId, `wallet:${wallet.id}`)}
          cents={displayBalance}
          currency={wallet.currency}
          ready={isOwedReady}
          as="span"
          className="text-muted-foreground min-w-fit text-xs"
        />
      </TransactionLink>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      {shortcut === undefined ? (
        menuButton
      ) : (
        <Popover open={hotkeyOpen} onOpenChange={setHotkeyOpen}>
          <PopoverTrigger asChild>{menuButton}</PopoverTrigger>
          <PopoverContent
            side="right"
            align="center"
            className="flex w-auto items-center gap-3 px-3 py-2"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <span className="text-sm font-medium">Open {wallet.name}</span>
            <Kbd>⌘ {shortcut}</Kbd>
          </PopoverContent>
        </Popover>
      )}
      <PlaidSyncMenuAction walletId={wallet.id} />
    </SidebarMenuItem>
  );
}

export function TransactionsSidebar() {
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [filters] = useTransactionQueryState();
  const { walletId } = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { walletsByCurrency, showOwedInBalance, isOwedReady } =
    useTotalBalance();
  const { activeWorkspace } = useWorkspace();
  const [views] = useViews();
  const [wallets] = useWallets();
  const queryClient = useQueryClient();
  const { open: formOpen } = useTransactionForm();
  const workspaceId = activeWorkspace?.id ?? "workspace";
  const hasPlaidWallets = wallets.some(
    (wallet) =>
      wallet.plaid_account_id &&
      wallet.plaid_sync_enabled &&
      wallet.plaid_sync_start_at,
  );

  // Get current month's start and end dates as fallback
  const now = new Date();
  const defaultFromDate = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultToDate = format(endOfMonth(now), "yyyy-MM-dd");

  // Use existing search params if they exist, otherwise use current month
  const fromDate = filters.from || defaultFromDate;
  const toDate = filters.to || defaultToDate;

  const deleteMutation = useMutation({
    mutationFn: async (viewId: string) => {
      await deleteViews([viewId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["views"] });
      toast.success("View deleted");
    },
    onError: (err: unknown) => {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to delete view");
    },
  });

  const handleDeleteClick = (viewId: string) => {
    deleteMutation.mutate(viewId);
  };

  const walletShortcutTargets = useMemo(
    () =>
      Object.entries(walletsByCurrency).flatMap(
        ([, currencyWallets]) => currencyWallets,
      ),
    [walletsByCurrency],
  );
  const copilotParams = new URLSearchParams(searchParams.toString());
  copilotParams.set("from", fromDate);
  copilotParams.set("to", toDate);
  const copilotQuery = copilotParams.toString();
  const copilotHref = walletId
    ? `/app/copilot/${walletId}${copilotQuery ? `?${copilotQuery}` : ""}`
    : `/app/copilot${copilotQuery ? `?${copilotQuery}` : ""}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts({ formOpen })) return;
      if (!event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0) return;
      const target = walletShortcutTargets[index];
      if (!target) return;
      event.preventDefault();
      const href = buildTransactionUrl({
        walletId: target.id,
        from: fromDate,
        to: toDate,
        searchParams,
        pathname,
      });
      router.push(href);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    formOpen,
    fromDate,
    pathname,
    router,
    searchParams,
    toDate,
    walletShortcutTargets,
  ]);

  return (
    <SidebarWrapper>
      <SidebarMenu className="px-2 pt-2">
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === "/app"}
            className={cn(
              hasPlaidWallets &&
                "pr-8 md:pr-2! md:group-focus-within/menu-item:pr-8! md:group-hover/menu-item:pr-8!",
            )}
          >
            <Link href="/app">
              <Home className="size-4" />
              Home
            </Link>
          </SidebarMenuButton>
          <PlaidSyncMenuAction />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname.includes("/copilot")}>
            <Link href={copilotHref}>
              <Bot className="size-4" />
              Copilot
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarGroup>
        <SidebarGroupLabel>Views</SidebarGroupLabel>
        <SidebarGroupAction
          onClick={() => setSaveViewOpen(true)}
          title="Save current view"
        >
          <Plus />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            {views.map((view) => (
              <SidebarMenuItem key={view.id}>
                <SidebarMenuButton asChild>
                  <Link href={`/app/transactions?${view.query_params}`}>
                    {view.name}
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuAction
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteClick(view.id);
                  }}
                  disabled={deleteMutation.isPending}
                  showOnHover
                >
                  <X />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {Object.entries(walletsByCurrency).map(([currency, currencyWallets]) => (
        <SidebarGroup key={currency}>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>{currency}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currencyWallets.map((wallet) => {
                const shortcutIndex = walletShortcutTargets.findIndex(
                  (w) => w.id === wallet.id,
                );
                const shortcut =
                  shortcutIndex >= 0 && shortcutIndex < 9
                    ? shortcutIndex + 1
                    : undefined;

                const displayBalance = showOwedInBalance
                  ? (wallet.balance_cents ?? 0) - (wallet.owed_cents ?? 0)
                  : (wallet.balance_cents ?? 0);

                return (
                  <WalletMenuItem
                    key={wallet.id}
                    wallet={wallet}
                    shortcut={shortcut}
                    isActive={walletId === wallet.id}
                    fromDate={fromDate}
                    toDate={toDate}
                    displayBalance={displayBalance}
                    workspaceId={workspaceId}
                    isOwedReady={isOwedReady}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
      <SaveViewDialog open={saveViewOpen} onOpenChange={setSaveViewOpen} />
    </SidebarWrapper>
  );
}
