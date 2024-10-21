import React from "react";

import Navigation from "./(components)/navigation";
import DateRangeFilter from "./transactions/(components)/date-range-filter";

import CategoryFilter from "@/app/app/(transactions)/transactions/(components)/category-filter";
import LabelFilter from "@/app/app/(transactions)/transactions/(components)/label-filter";
import WalletFilter from "@/app/app/(transactions)/transactions/(components)/wallet-filter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="flex divide-x w-full">
      <div className="w-48 shrink-0 p-4 hidden md:block">
        <Navigation />
        {/* <TransactionsAreaChart /> */}
        <WalletFilter />
      </div>
      <div className="grow divide-y">
        <div className="h-10 px-2">
          <DateRangeFilter />
        </div>
        <div className="h-10 px-2 flex items-center gap-2">
          <LabelFilter />
          <CategoryFilter />
        </div>
        {children}
      </div>
    </div>
  );
};

export default Layout;
