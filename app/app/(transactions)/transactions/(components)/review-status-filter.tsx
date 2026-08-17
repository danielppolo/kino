"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

export default function ReviewStatusFilter() {
  const [filters, setFilters] = useTransactionQueryState();
  const isActive = filters.review_status === "needs_review";

  return (
    <Button
      className="w-auto justify-start"
      size="sm"
      variant={isActive ? "secondary" : "ghost"}
      onClick={() =>
        setFilters({
          page: null,
          review_status: isActive ? null : "needs_review",
        })
      }
    >
      <AlertTriangle className="mr-2 size-4" />
      Needs review
    </Button>
  );
}
