"use client";

import * as React from "react";
import { ChevronsUpDown, LogOut, PiggyBank } from "lucide-react";

import { signOutAction } from "@/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { formatCents } from "@/utils/format-cents";

export function SidebarHeaderMenu() {
  const { isMobile } = useSidebar();
  const { totalBalance, baseCurrency } = useTotalBalance();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <PiggyBank className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-display truncate">cuatrocientosdos</span>
                <span className="truncate text-xs">
                  {formatCents(totalBalance, baseCurrency)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuItem className="gap-2 p-2">
              <form action={signOutAction} className="w-full">
                <button className="flex w-full items-center gap-2 bg-transparent">
                  <LogOut className="size-4" />
                  <span className="text-muted-foreground font-medium">
                    Logout
                  </span>
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
