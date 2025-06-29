import React from "react";

import ChartToggle from "./(components)/chart-toggle";
import MonthPagination from "./transactions/(components)/month-pagination";

import { AddTransactionDropdown } from "@/components/shared/add-transaction-dropdown";
import SaveViewButton from "@/components/shared/save-view-button";
import { FiltersDropdown } from "@/components/shared/filters-dropdown";
import TransactionForm from "@/components/shared/transaction-form";
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
          <div className="flex h-11 items-center justify-between gap-2 px-3">
            <div className="flex items-center gap-2">
              <MonthPagination />
            </div>
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <FiltersDropdown />
              <SaveViewButton />
              <ChartToggle />
              <AddTransactionDropdown />
            </div>
          </div>
          {children}
        </main>
      </SidebarInset>
      <TransactionForm />
    </TransactionFormProvider>
  );
};

export default Layout;
