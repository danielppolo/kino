"use client";

import * as React from "react";

import { TransactionLink } from "./transaction-link";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Money } from "@/components/ui/money";
import { useTotalBalance } from "@/hooks/use-total-balance";

export function SidebarHeaderMenu() {
  const { totalBalance, baseCurrency } = useTotalBalance();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <TransactionLink>
            <>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-display truncate">cuatrocientosdos</span>
                <Money
                  cents={totalBalance}
                  currency={baseCurrency}
                  as="span"
                  className="truncate text-xs"
                />
              </div>
            </>
          </TransactionLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
