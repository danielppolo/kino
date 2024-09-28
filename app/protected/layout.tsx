import React from "react";

import { FilterProvider } from "./filter-context";

import CategoryFilter from "@/components/shared/category-filter";
import SubjectFilter from "@/components/shared/subject-filter";
import WalletFilter from "@/components/shared/wallet-filter";

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
              <CategoryFilter />
            </div>
            <SubjectFilter />
          </div>
          {children}
        </div>
      </div>
    </FilterProvider>
  );
};

export default Layout;
