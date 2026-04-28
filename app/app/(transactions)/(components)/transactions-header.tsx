"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import MonthPagination from "../transactions/(components)/month-pagination";
import BillsBalanceBadge from "./bills-balance-badge";
import BillsToggle from "./bills-toggle";
import ChartToggle from "./chart-toggle";

import { AddTransactionDropdown } from "@/components/shared/add-transaction-dropdown";
import { BillsSheet } from "@/components/shared/bills-sheet";
import { FiltersDropdown } from "@/components/shared/filters-dropdown";
import PageHeader from "@/components/shared/page-header";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import TransactionTotal from "@/components/shared/transaction-total";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useFeatureFlags } from "@/contexts/settings-context";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function TransactionsHeader() {
  const [billsSheetOpen, setBillsSheetOpen] = useState(false);
  const { bills_enabled } = useFeatureFlags();
  const [filters, setFilters] = useTransactionQueryState();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCopilotRoute = pathname.startsWith("/app/copilot");
  const reviewFilterActive = filters.review_status === "needs_review";

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

  const handleToggleNeedsReview = () => {
    setFilters({
      page: null,
      review_status: reviewFilterActive ? null : "needs_review",
    });
  };

  if (isCopilotRoute) {
    return null;
  }

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2">
          <MonthPagination />
        </div>
        <div className="flex items-center gap-2">
          {bills_enabled && <BillsBalanceBadge />}
          <TransactionTotal />
          {bills_enabled && (
            <BillsToggle onOpenSheet={() => setBillsSheetOpen(true)} />
          )}
          <ChartToggle />
          <TooltipButton
            variant={reviewFilterActive ? "secondary" : "ghost"}
            size="sm"
            tooltip={
              reviewFilterActive
                ? "Show all transactions"
                : "Show transactions that need review"
            }
            onClick={handleToggleNeedsReview}
          >
            <AlertTriangle className="h-4 w-4" />
          </TooltipButton>
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
