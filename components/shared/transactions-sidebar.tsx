"use client";

import { endOfMonth, format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { SidebarWrapper } from "./sidebar-wrapper";
import { TransactionLink } from "./transaction-link";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { useViews } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

export function TransactionsSidebar() {
  const searchParams = useSearchParams();
  const { walletsByCurrency } = useTotalBalance();
  const [views] = useViews();

  // Get current month's start and end dates as fallback
  const now = new Date();
  const defaultFromDate = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultToDate = format(endOfMonth(now), "yyyy-MM-dd");

  // Use existing search params if they exist, otherwise use current month
  const fromDate = searchParams.get("from") || defaultFromDate;
  const toDate = searchParams.get("to") || defaultToDate;

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
                    <Link href={`/app/transactions?${view.query_params}`}>{view.name}</Link>
                  </SidebarMenuButton>
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
                  <SidebarMenuButton
                    asChild
                    isActive={searchParams.get("walletId") === wallet.id}
                  >
                    <TransactionLink
                      walletId={wallet.id}
                      from={fromDate}
                      to={toDate}
                    >
                      <span className="flex-1">{wallet.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatCents(
                          wallet.balance_cents ?? 0,
                          wallet.currency,
                        )}
                      </span>
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
