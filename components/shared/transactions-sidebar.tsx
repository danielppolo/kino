"use client";

import { useEffect } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { X } from "lucide-react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SidebarWrapper } from "./sidebar-wrapper";
import { TransactionLink } from "./transaction-link";
import { WalletTypeIcon } from "./wallet-type-icon";

import { Kbd } from "@/components/ui/kbd";
import { Money } from "@/components/ui/money";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useViews } from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import { buildTransactionUrl } from "@/utils/build-transaction-url";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { deleteViews } from "@/utils/supabase/mutations";

export function TransactionsSidebar() {
  const [filters] = useTransactionQueryState();
  const { walletId } = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { walletsByCurrency, showOwedInBalance } = useTotalBalance();
  const [views] = useViews();
  const queryClient = useQueryClient();
  const { open: formOpen } = useTransactionForm();

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

  const walletShortcutTargets = Object.entries(walletsByCurrency).flatMap(
    ([, currencyWallets]) => currencyWallets,
  );

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
      {views.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Views</SidebarGroupLabel>
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
      )}
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
                  <SidebarMenuItem key={wallet.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={walletId === wallet.id}
                    >
                      <TransactionLink
                        walletId={wallet.id}
                        from={fromDate}
                        to={toDate}
                        shortcut={shortcut}
                      >
                        <WalletTypeIcon
                          walletType={wallet.wallet_type}
                          className="text-muted-foreground mr-2 size-4"
                        />
                        <span className="flex-1">{wallet.name}</span>

                        <span className="relative inline-flex min-w-fit items-center justify-center">
                          <Money
                            cents={displayBalance}
                            currency={wallet.currency}
                            as="span"
                            className="text-muted-foreground text-xs group-hover/wallet-link:hidden"
                          />
                          {shortcut !== undefined && (
                            <div className="hidden group-hover/wallet-link:inline-flex">
                              <Kbd>⌘ {shortcut}</Kbd>
                            </div>
                          )}
                        </span>
                      </TransactionLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarWrapper>
  );
}
