import React from "react";

import WalletFilter from "@/app/app/(transactions)/transactions/(components)/wallet-filter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="flex divide-x w-full">
      <div className="w-48 shrink-0">
        {/* <TransactionsAreaChart /> */}
        <WalletFilter />
      </div>
      {children}
    </div>
  );
};

export default Layout;
