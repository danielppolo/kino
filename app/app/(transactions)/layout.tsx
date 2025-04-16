import React from "react";

import CategoryFilter from "./transactions/(components)/category-filter";
import DateRangeFilter from "./transactions/(components)/date-range-filter";
import LabelFilter from "./transactions/(components)/label-filter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return children;
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
        <div className="flex h-10 items-center gap-2 px-2">
          <LabelFilter />
          <CategoryFilter />
        </div>
        {children}
      </div>
    </div>
  );
};

export default Layout;
