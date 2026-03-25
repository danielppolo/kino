"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown } from "lucide-react";

import { Money } from "@/components/ui/money";
import {
  SidebarMenu,
  SidebarMenuAction,
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
  const workspaceIcon = activeWorkspace?.icon || workspaceName.charAt(0);

  // Single workspace - show simple button
  if (!hasMultipleWorkspaces) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="lg">
            <Link href="/app/transactions">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {workspaceIcon}
              </div>
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
          <SidebarMenuButton
            asChild
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            disabled={isLoading || isSwitching}
          >
            <Link href="/app/transactions">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {workspaceIcon}
              </div>
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
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              disabled={isLoading || isSwitching}
              aria-label="Open workspace switcher"
            >
              <ChevronsUpDown className="size-4" />
            </SidebarMenuAction>
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
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <span className="text-xs font-semibold">
                    {workspace.icon || workspace.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 font-medium">{workspace.name}</div>
                {workspace.id === activeWorkspace?.id && (
                  <Check className="size-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
