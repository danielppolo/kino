"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

export function TransactionsSidebar() {
  const [wallets] = useWallets();
  const sortedWallets = wallets
    .filter((w) => w.visible)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group wallets by currency
  const walletsByCurrency = sortedWallets.reduce(
    (acc, wallet) => {
      if (!acc[wallet.currency]) acc[wallet.currency] = [];
      acc[wallet.currency].push(wallet);
      return acc;
    },
    {} as Record<string, typeof wallets>,
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <h1 className="font-display px-2 text-base">cuatrocientosdos</h1>
      </SidebarHeader>
      <SidebarContent>
        {Object.entries(walletsByCurrency).map(
          ([currency, currencyWallets]) => {
            // Calculate total for this currency group
            const total = (currencyWallets as typeof sortedWallets).reduce(
              (sum: number, wallet) => sum + (wallet.balance_cents ?? 0),
              0,
            );

            return (
              <SidebarGroup key={currency}>
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span>{currency}</span>
                  <span>{formatCents(total, currency)}</span>
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {(currencyWallets as typeof sortedWallets).map((wallet) => (
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
            );
          },
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <form action={signOutAction} className="w-full">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2"
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </button>
              </form>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
