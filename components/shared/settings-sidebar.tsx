"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
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
  const { walletId } = useParams<{ walletId: string }>();

  // Sort wallets alphabetically by name
  const sortedWallets = wallets.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Sidebar variant="sidebar" className="w-64">
      <SidebarContent>
        {/* Workspace Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/app/settings/general">General</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/app/settings/overview">Overview</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/app/settings/labels">Labels</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/app/settings/categories">Categories</Link>
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
                    <Link
                      key={wallet.id}
                      href={`/app/settings/wallets/${wallet.id}`}
                    >
                      {wallet.name}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default SettingsSidebar;
