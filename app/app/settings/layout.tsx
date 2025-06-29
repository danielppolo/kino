import React from "react";

import SettingsSidebar from "@/components/shared/settings-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <>
      <SettingsSidebar />

      <SidebarInset>
        <main className="relative flex-1">{children}</main>
      </SidebarInset>
    </>
  );
};

export default Layout;
