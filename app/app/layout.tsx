import React from "react";

import { Providers } from "@/app/providers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsProvider } from "@/contexts/settings-context";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Providers>
      <SidebarProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </SidebarProvider>
    </Providers>
  );
}
