import React from "react";

import CategoryFilter from "./transactions/(components)/category-filter";
import DateRangeFilter from "./transactions/(components)/date-range-filter";
import LabelFilter from "./transactions/(components)/label-filter";

import AddTransactionButton from "@/components/shared/add-transaction-button";
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
            <DateRangeFilter />
            <LabelFilter />
            <CategoryFilter />
          </div>
          <div className="flex items-center gap-2">
            <AddTransactionButton
              type="transfer"
              // onOptimisticSuccess={addOptimisticTransaction}
            />
            <AddTransactionButton
              type="income"
              // onOptimisticSuccess={addOptimisticTransaction}
            />
            <AddTransactionButton
              type="expense"
              // onOptimisticSuccess={addOptimisticTransaction}
            />
          </div>
        </div>
        {children}
      </main>
    </>
  );
};

export default Layout;
