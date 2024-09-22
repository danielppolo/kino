import React from "react";

import CategoryFilter from "@/components/shared/category-filter";
import DateRangeFilter from "@/components/shared/date-range-filter";
import SubjectFilter from "@/components/shared/subject-filter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      {/*  border-b border-b-foreground/10 */}
      <div className="container mx-auto divide-y">
        <DateRangeFilter />
        <SubjectFilter />
        <CategoryFilter />
      </div>
      {children}
    </>
  );
};

export default Layout;
