"use client";

import React from "react";
import {
  Building,
  Internet,
  Folder,
  Hashtag,
  Label,
  MultiplePages,
  Page,
  RefreshDouble,
  Reports,
  User,
  ViewGrid,
  Wallet,
} from "iconoir-react";
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
import { useFeatureFlags } from "@/contexts/settings-context";

const SettingsSidebar: React.FC = () => {
  const { bills_enabled } = useFeatureFlags();
  const pathname = usePathname();

  return (
    <SidebarWrapper>
      {/* Workspace Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/workspaces"}
              >
                <Link href="/app/settings/workspaces">
                  <Building className="size-4" />
                  Workspaces
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/wallets"}
              >
                <Link href="/app/settings/wallets">
                  <Wallet className="size-4" />
                  Wallets
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/assets"}
              >
                <Link href="/app/settings/assets">
                  <Building className="size-4" />
                  Assets
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/members"}
              >
                <Link href="/app/settings/members">
                  <MultiplePages className="size-4" />
                  Members
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/integrations"}
              >
                <Link href="/app/settings/integrations">
                  <Internet className="size-4" />
                  Integrations
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/preferences"}
              >
                <Link href="/app/settings/preferences">
                  <User className="size-4" />
                  Preferences
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/reports"}
              >
                <Link href="/app/settings/reports">
                  <Reports className="size-4" />
                  Advisor report
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/recurrent-transactions"}
              >
                <Link href="/app/settings/recurrent-transactions">
                  <RefreshDouble className="size-4" />
                  Periodic transactions
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/categories"}
              >
                <Link href="/app/settings/categories">
                  <Folder className="size-4" />
                  Categories
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/labels"}
              >
                <Link href="/app/settings/labels">
                  <Label className="size-4" />
                  Labels
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/tags"}
              >
                <Link href="/app/settings/tags">
                  <Hashtag className="size-4" />
                  Tags
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/views"}
              >
                <Link href="/app/settings/views">
                  <ViewGrid className="size-4" />
                  Views
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/app/settings/templates"}
              >
                <Link href="/app/settings/templates">
                  <Page className="size-4" />
                  Templates
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {bills_enabled && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/app/settings/bills"}
                >
                  <Link href="/app/settings/bills">
                    <Reports className="size-4" />
                    Bills
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarWrapper>
  );
};

export default SettingsSidebar;
