import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="flex w-full divide-x">
      {/* <div className="w-48 shrink-0 p-4 hidden md:block">
        <Navigation />
        <TransactionsAreaChart />
        <WalletFilter />
      </div> */}
      <div className="grow divide-y">
        {/* <div className="h-10 px-2">
          <DateRangeFilter />
        </div>
        <div className="flex h-10 items-center gap-2 px-2">
          <LabelFilter />
          <CategoryFilter />
        </div> */}
        {children}
      </div>
    </div>
  );
};

export default Layout;
