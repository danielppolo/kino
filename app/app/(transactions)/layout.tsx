import React from "react";

import { TransactionsHeader } from "./(components)/transactions-header";

import TransactionForm from "@/components/shared/transaction-form";
import TransactionShortcuts from "@/components/shared/transaction-shortcuts";
import { TransactionsSidebar } from "@/components/shared/transactions-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
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
          <TransactionsHeader />
          {children}
        </main>
      </SidebarInset>
      <TransactionForm />
      <TransactionShortcuts />
    </TransactionFormProvider>
  );
};

export default Layout;
