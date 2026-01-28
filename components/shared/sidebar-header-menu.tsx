"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown } from "lucide-react";

import { Money } from "@/components/ui/money";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { useWorkspace } from "@/contexts/workspace-context";
import { cn } from "@/lib/utils";

export function SidebarHeaderMenu() {
  const { totalBalance, baseCurrency, showOwedInBalance } = useTotalBalance();
  const { activeWorkspace, workspaces, switchWorkspace, isLoading } =
    useWorkspace();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) return;

    setIsSwitching(true);
    try {
      await switchWorkspace(workspaceId);
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  const workspaceName = activeWorkspace?.name || "Loading...";
  const hasMultipleWorkspaces = workspaces.length > 1;

  // Single workspace - show simple button
  if (!hasMultipleWorkspaces) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="lg">
            <Link href="/app/transactions">
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-display truncate">{workspaceName}</span>
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

  // Multiple workspaces - show dropdown
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={isLoading || isSwitching}
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-display truncate">{workspaceName}</span>
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
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSwitchWorkspace(workspace.id)}
                className="cursor-pointer gap-2 p-2"
                disabled={isSwitching}
              >
                <div className="flex size-6 items-center justify-center">
                  {workspace.id === activeWorkspace?.id && (
                    <Check className="size-4" />
                  )}
                </div>
                <div className="font-medium">{workspace.name}</div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
