import React from "react";

import CategoryFilter from "@/components/shared/category-filter";
import LabelFilter from "@/components/shared/label-filter";
import WalletFilter from "@/components/shared/wallet-filter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="flex divide-x w-full">
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
  );
};

export default Layout;
