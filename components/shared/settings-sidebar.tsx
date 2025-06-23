"use client";

import React from "react";
import Link from "next/link";

import { SidebarWrapper } from "./sidebar-wrapper";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useWallets } from "@/contexts/settings-context";

const SettingsSidebar: React.FC = () => {
  const [wallets] = useWallets();

  // Sort wallets alphabetically by name
  const sortedWallets = wallets.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SidebarWrapper>
      {/* Workspace Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app/settings">General</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app/settings/overview">Overview</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app/settings/categories">Categories</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app/settings/labels">Labels</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app/settings/tags">Tags</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app/settings/profile">Profile</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Wallets Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Wallets</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {sortedWallets?.map((wallet) => (
              <SidebarMenuItem key={wallet.id}>
                <SidebarMenuButton asChild>
                  <Link href={`/app/settings/wallets/${wallet.id}`}>
                    {wallet.name}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarWrapper>
  );
};

export default SettingsSidebar;
