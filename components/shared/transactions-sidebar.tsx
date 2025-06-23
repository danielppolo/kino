"use client";

import { endOfMonth, format, startOfMonth } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarWrapper } from "./sidebar-wrapper";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { formatCents } from "@/utils/format-cents";

export function TransactionsSidebar() {
  const pathname = usePathname();
  const { walletsByCurrency } = useTotalBalance();

  // Get current month's start and end dates
  const now = new Date();
  const fromDate = format(startOfMonth(now), "yyyy-MM-dd");
  const toDate = format(endOfMonth(now), "yyyy-MM-dd");

  return (
    <SidebarWrapper>
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
                    isActive={pathname.includes(wallet.id)}
                  >
                    <Link
                      href={`/app/transactions/${wallet.id}?from=${fromDate}&to=${toDate}`}
                    >
                      <span className="flex-1">{wallet.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatCents(
                          wallet.balance_cents ?? 0,
                          wallet.currency,
                        )}
                      </span>
                    </Link>
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
