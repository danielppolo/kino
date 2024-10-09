import React from "react";

import LabelFilter from "@/components/shared/label-filter";
import CategoryFilter from "@/components/shared/category-filter";
import WalletFilter from "@/components/shared/wallet-filter";
import { FilterProvider } from "@/contexts/filter-context";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <FilterProvider>
      <div className="flex divide-x">
        {/*  border-b border-b-foreground/10 */}
        <div className="divide-y w-96 shrink-0">
          {/* <TransactionsAreaChart /> */}
        </div>
        <div className="grow divide-y">
          <div className="h-12 px-2">
            <WalletFilter />
          </div>
          <div className="h-10 px-2 flex items-center">
            {/* <DateRangeFilter /> */}

            <div className="w-[50px]">
              <LabelFilter />
            </div>
            <CategoryFilter />
          </div>
          {children}
        </div>
      </div>
    </FilterProvider>
  );
};

export default Layout;
