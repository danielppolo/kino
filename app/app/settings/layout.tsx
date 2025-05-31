import React from "react";

import SettingsSidebar from "@/components/shared/settings-sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <SettingsSidebar />

      {/* Main Content Area */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
};

export default Layout;
