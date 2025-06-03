"use client";

import * as React from "react";
import Link from "next/link";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { formatCents } from "@/utils/format-cents";

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
          <Link href="/app/transactions">
            <>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-display truncate">cuatrocientosdos</span>
                <span className="truncate text-xs">
                  {formatCents(totalBalance, baseCurrency)}
                </span>
              </div>
            </>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
