import React from "react";

import ChartToggle from "./(components)/chart-toggle";
import RecurringToggle from "./(components)/recurring-toggle";
import MonthPagination from "./transactions/(components)/month-pagination";

import { AddTransactionDropdown } from "@/components/shared/add-transaction-dropdown";
import { FiltersDropdown } from "@/components/shared/filters-dropdown";
import PageHeader from "@/components/shared/page-header";
import SaveViewButton from "@/components/shared/save-view-button";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import TransactionForm from "@/components/shared/transaction-form";
import TransactionTotal from "@/components/shared/transaction-total";
import { TransactionsSidebar } from "@/components/shared/transactions-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TransactionFormProvider } from "@/contexts/transaction-form-context";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <TransactionFormProvider>
      <TransactionsSidebar />
      <SidebarInset>
        <main className="flex-1">
          <PageHeader>
            <div className="flex items-center gap-2">
              <MonthPagination />
            </div>
            <div className="flex items-center gap-2">
              <TransactionTotal />
              <RecurringToggle />
              <SaveViewButton />
              <ChartToggle />
              <SortDropdown />
              <FiltersDropdown />
              <AddTransactionDropdown />
              <SidebarTrigger />
            </div>
          </PageHeader>
          {children}
        </main>
      </SidebarInset>
      <TransactionForm />
    </TransactionFormProvider>
  );
};

export default Layout;
