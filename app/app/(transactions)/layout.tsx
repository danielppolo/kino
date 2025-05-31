import React from "react";

import CategoryFilter from "./transactions/(components)/category-filter";
import DateRangeFilter from "./transactions/(components)/date-range-filter";
import LabelFilter from "./transactions/(components)/label-filter";

import { TransactionsSidebar } from "@/components/shared/transactions-sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <>
      <TransactionsSidebar />
      <main className="flex-1">
        <div className="flex h-11 items-center gap-2 px-4">
          <DateRangeFilter />
          <LabelFilter />
          <CategoryFilter />
        </div>
        {children}
      </main>
    </>
  );
  return (
    <div className="flex w-full divide-x">
      {/* <div className="w-48 shrink-0 p-4 hidden md:block">
        <Navigation />
        <TransactionsAreaChart />
        <WalletFilter />
      </div> */}
      <div className="grow divide-y">
        <div className="h-10 px-2">
          <DateRangeFilter />
        </div>
        <div className="flex h-10 items-center gap-2 px-2"></div>
        {children}
      </div>
    </div>
  );
};

export default Layout;
