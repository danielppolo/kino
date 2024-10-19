import React from "react";

import CategoryFilter from "@/app/app/(transactions)/transactions/(components)/category-filter";
import LabelFilter from "@/app/app/(transactions)/transactions/(components)/label-filter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="grow divide-y">
      <div className="h-10 pl-2 pr-4 flex items-center justify-between">
        {/* <DateRangeFilter /> */}

        <div className="flex items-center">
          <div className="w-12">
            <LabelFilter />
          </div>
          <div className="w-12">
            <CategoryFilter />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default Layout;
