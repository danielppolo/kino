"use client";

import { endOfMonth, format, startOfMonth } from "date-fns";
import { X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SidebarWrapper } from "./sidebar-wrapper";
import { TransactionLink } from "./transaction-link";

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
import { useTotalBalance } from "@/hooks/use-total-balance";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import { deleteViews } from "@/utils/supabase/mutations";

export function TransactionsSidebar() {
  const [filters] = useTransactionQueryState();
  const { walletId } = useParams();
  const { walletsByCurrency } = useTotalBalance();
  const [views] = useViews();
  const queryClient = useQueryClient();

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
              {currencyWallets.map((wallet) => (
                <SidebarMenuItem key={wallet.id}>
                  <SidebarMenuButton asChild isActive={walletId === wallet.id}>
                    <TransactionLink
                      walletId={wallet.id}
                      from={fromDate}
                      to={toDate}
                    >
                      <span className="flex-1">{wallet.name}</span>

                      <Money
                        cents={wallet.balance_cents ?? 0}
                        currency={wallet.currency}
                        as="span"
                        className="text-muted-foreground text-xs"
                      />
                    </TransactionLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarWrapper>
  );
}
