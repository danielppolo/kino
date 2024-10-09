import React from "react";
import Link from "next/link"; // Assuming you're using Next.js

import { Menu, MenuItem } from "@/components/ui/menu";
import { listWallets } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  const supabase = createClient();
  const { data: wallets, error } = await listWallets(supabase);

  if (error) {
    throw error;
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Sidebar */}
      <div className="w-64 p-6 border-r space-y-6 shrink-0">
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

        <Menu title="Wallets">
          {wallets?.map((wallet) => (
            <Link key={wallet.id} href={`/app/settings/wallets/${wallet.id}`}>
              <MenuItem label={wallet.name} active={false} />
            </Link>
          ))}
        </Menu>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
};

export default Layout;
