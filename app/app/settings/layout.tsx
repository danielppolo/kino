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
        <div className="flex-1 px-6">{children}</div>
      </SidebarInset>
    </>
  );
};

export default Layout;
