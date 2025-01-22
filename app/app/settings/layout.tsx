import React from "react";
import Link from "next/link"; // Assuming you're using Next.js

import WalletSection from "./(components)/wallet-list";

import { Menu, MenuItem } from "@/components/ui/menu";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <div className="w-64 shrink-0 space-y-6 border-r p-6">
        {/* Workspace Section */}
        <Menu title="Workspace">
          <Link href="/app/settings/general">
            <MenuItem label="General" active={false} />
          </Link>
          <Link href="/app/settings/overview">
            <MenuItem label="Overview" active={false} />
          </Link>
          <Link href="/app/settings/labels">
            <MenuItem label="Labels" active={false} />
          </Link>
          <Link href="/app/settings/categories">
            <MenuItem label="Categories" active={false} />
          </Link>
        </Menu>

        <Menu title="Account">
          <Link href="/app/settings/profile">
            <MenuItem label="Profile" active={false} />
          </Link>
        </Menu>

        <WalletSection />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
};

export default Layout;
