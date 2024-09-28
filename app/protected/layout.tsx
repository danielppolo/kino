import React from "react";

import { FilterProvider } from "./filter-context";

import CategoryFilter from "@/components/shared/category-filter";
import DateRangeFilter from "@/components/shared/date-range-filter";
import SubjectFilter from "@/components/shared/subject-filter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <FilterProvider>
      <div className="flex">
        {/*  border-b border-b-foreground/10 */}
        <div className="divide-y w-96">
          <DateRangeFilter />
          <SubjectFilter />
          <CategoryFilter />
        </div>
        <div className="grow">
          <div className="h-12">hello world</div>
          {children}
        </div>
      </div>
    </FilterProvider>
  );
};

export default Layout;
