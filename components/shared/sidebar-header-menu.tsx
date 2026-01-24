"use client";

import * as React from "react";
import Link from "next/link";

import { Money } from "@/components/ui/money";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTotalBalance } from "@/hooks/use-total-balance";

export function SidebarHeaderMenu() {
  const { totalBalance, baseCurrency, showOwedInBalance } = useTotalBalance();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Link href="/app/transactions">
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="font-display truncate">cuatrocientosdos</span>
              <Money
                cents={totalBalance}
                currency={baseCurrency}
                as="span"
                className="truncate text-xs"
              />
              {showOwedInBalance && (
                <span className="text-muted-foreground text-xs">
                  (incl. owed)
                </span>
              )}
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
