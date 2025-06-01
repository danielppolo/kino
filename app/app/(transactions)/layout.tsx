import React from "react";

import { AddTransactionDropdown } from "@/components/shared/add-transaction-dropdown";
import { FiltersDropdown } from "@/components/shared/filters-dropdown";
import { TransactionsSidebar } from "@/components/shared/transactions-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <>
      <TransactionsSidebar />
      <main className="flex-1">
        <div className="flex h-11 items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <FiltersDropdown />
          </div>
          <div className="flex items-center gap-2">
            <AddTransactionDropdown />
          </div>
        </div>
        {children}
      </main>
    </>
  );
};

export default Layout;
