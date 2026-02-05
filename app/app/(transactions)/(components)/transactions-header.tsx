"use client";

import { useEffect, useState } from "react";

import MonthPagination from "../transactions/(components)/month-pagination";
import BillsBalanceBadge from "./bills-balance-badge";
import BillsToggle from "./bills-toggle";
import ChartToggle from "./chart-toggle";

import { AddTransactionDropdown } from "@/components/shared/add-transaction-dropdown";
import { BillsSheet } from "@/components/shared/bills-sheet";
import { FiltersDropdown } from "@/components/shared/filters-dropdown";
import PageHeader from "@/components/shared/page-header";
import SaveViewButton from "@/components/shared/save-view-button";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import TransactionTotal from "@/components/shared/transaction-total";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useFeatureFlags } from "@/contexts/settings-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function TransactionsHeader() {
  const [billsSheetOpen, setBillsSheetOpen] = useState(false);
  const { bills_enabled } = useFeatureFlags();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!bills_enabled) return;
    if (!pathname.includes("/app/transactions/")) return;

    if (searchParams.get("bills") === "open") {
      setBillsSheetOpen(true);
    }
  }, [bills_enabled, pathname, searchParams]);

  const handleBillsSheetOpenChange = (nextOpen: boolean) => {
    setBillsSheetOpen(nextOpen);
    if (nextOpen || searchParams.get("bills") !== "open") return;

    const current = new URLSearchParams(searchParams.toString());
    current.delete("bills");
    const query = current.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2">
          <MonthPagination />
        </div>
        <div className="flex items-center gap-2">
          {bills_enabled && <BillsBalanceBadge />}
          <TransactionTotal />
          <SaveViewButton />
          {bills_enabled && (
            <BillsToggle onOpenSheet={() => setBillsSheetOpen(true)} />
          )}
          <ChartToggle />
          <SortDropdown />
          <FiltersDropdown />
          <AddTransactionDropdown />
          <SidebarTrigger />
        </div>
      </PageHeader>
      {bills_enabled && (
        <BillsSheet
          open={billsSheetOpen}
          onOpenChange={handleBillsSheetOpenChange}
        />
      )}
    </>
  );
}
