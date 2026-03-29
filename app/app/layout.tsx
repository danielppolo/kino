import React from "react";

import AuthenticatedProviders from "./providers";

import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { WorkspaceSettingsBridge } from "@/contexts/workspace-settings-bridge";
import { createClient } from "@/utils/supabase/server";

// Force dynamic rendering since this layout uses user-specific data
export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  return (
    <AuthenticatedProviders key={user.id} userId={user.id}>
      <SidebarProvider>
        <WorkspaceProvider userId={user.id}>
          <WorkspaceSettingsBridge>{children}</WorkspaceSettingsBridge>
        </WorkspaceProvider>
      </SidebarProvider>
    </AuthenticatedProviders>
  );
}
