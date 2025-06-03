"use client";

import Link from "next/link";

import { SidebarHeaderMenu } from "./sidebar-header-menu";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { formatCents } from "@/utils/format-cents";

export function TransactionsSidebar() {
  const { walletsByCurrency } = useTotalBalance();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarHeaderMenu />
      </SidebarHeader>
      <SidebarContent>
        {Object.entries(walletsByCurrency).map(
          ([currency, currencyWallets]) => (
            <SidebarGroup key={currency}>
              <SidebarGroupLabel className="flex items-center justify-between">
                <span>{currency}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {currencyWallets.map((wallet) => (
                    <SidebarMenuItem key={wallet.id}>
                      <SidebarMenuButton asChild>
                        <Link href={`/app/transactions/${wallet.id}`}>
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
          ),
        )}
      </SidebarContent>
    </Sidebar>
  );
}
