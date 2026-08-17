"use client";

import * as React from "react";
import { Check } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

import { AnimatedMoney } from "@/components/ui/animated-money";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LazyIcon } from "@/components/ui/icon";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/contexts/workspace-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import {
  readSidebarBalance,
  sidebarBalanceKey,
} from "@/utils/sidebar-balance-snapshot";

function WorkspaceGlyph({
  icon,
  name,
  compact = false,
}: {
  icon: string | null;
  name: string;
  compact?: boolean;
}) {
  const initial = name.charAt(0);
  const slug = icon?.trim();
  if (slug && slug in dynamicIconImports) {
    return (
      <LazyIcon
        name={slug}
        className={compact ? "size-3.5" : "size-4"}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}
    >
      {initial}
    </span>
  );
}

export function SidebarHeaderMenu() {
  const {
    totalBalance,
    baseCurrency,
    showOwedInBalance,
    isTotalBalanceReady,
    isTotalBalanceRefreshing,
  } = useTotalBalance();
  const { activeWorkspace, workspaces, switchWorkspace, isLoading } =
    useWorkspace();
  const [isSwitching, setIsSwitching] = React.useState(false);
  const totalBalanceKey = activeWorkspace
    ? sidebarBalanceKey(activeWorkspace.id, "total")
    : "total";
  const cachedTotalBalance = readSidebarBalance(totalBalanceKey);
  const showTotalBalance =
    isTotalBalanceReady || cachedTotalBalance !== undefined;

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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isLoading || isSwitching}>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold">
                <WorkspaceGlyph
                  icon={activeWorkspace?.icon ?? null}
                  name={workspaceName}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-display truncate">{workspaceName}</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  {showTotalBalance ? (
                    <AnimatedMoney
                      balanceKey={totalBalanceKey}
                      cents={totalBalance}
                      currency={baseCurrency}
                      ready={isTotalBalanceReady}
                      as="span"
                      className="truncate text-xs"
                    />
                  ) : null}
                  {isTotalBalanceRefreshing ? (
                    <Spinner className="text-muted-foreground size-3 shrink-0" />
                  ) : null}
                </span>
                {showOwedInBalance && (
                  <span className="text-muted-foreground text-xs">
                    (incl. owed)
                  </span>
                )}
              </div>
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
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <WorkspaceGlyph
                    icon={workspace.icon}
                    name={workspace.name}
                    compact
                  />
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
