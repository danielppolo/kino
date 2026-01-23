"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import BillGroupHeader, { BillGroupHeaderLoading } from "./bill-group-header";
import EmptyState from "./empty-state";
import TransactionRow from "./transaction-row";

import { RowLoading } from "@/components/ui/row";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { createClient } from "@/utils/supabase/client";
import { listBillsWithPayments } from "@/utils/supabase/queries";
import { BillWithPayments, Transaction } from "@/utils/supabase/types";

interface BillsListProps {
  walletId?: string;
}

export default function BillsList({ walletId }: BillsListProps) {
  const { openForm } = useTransactionForm();

  const { data: bills, isLoading } = useQuery<BillWithPayments[]>({
    queryKey: ["bills-with-payments", walletId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listBillsWithPayments(supabase, { walletId });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  const sortedBills = useMemo(() => {
    if (!bills) return [];
    // Sort by due date, then by payment status (unpaid first)
    return [...bills].sort((a, b) => {
      // First sort by payment status (incomplete first)
      if (a.payment_percentage < 100 && b.payment_percentage >= 100) return -1;
      if (a.payment_percentage >= 100 && b.payment_percentage < 100) return 1;
      // Then sort by due date
      return a.due_date.localeCompare(b.due_date);
    });
  }, [bills]);

  const handleTransactionClick = (transaction: any) => {
    openForm({
      type: transaction.type,
      walletId: transaction.wallet_id,
      initialData: transaction as Transaction,
    });
  };

  if (isLoading) {
    return <BillsListLoading />;
  }

  if (!bills || bills.length === 0) {
    return (
      <EmptyState
        title="No bills found"
        description="Add bills in Settings to track your payment responsibilities."
      />
    );
  }

  return (
    <div
      style={{ height: "calc(100vh - 44px - 44px)", overflow: "auto" }}
      className="relative w-full divide-y overflow-hidden"
    >
      {sortedBills.map((bill) => (
        <div key={bill.id}>
          <BillGroupHeader bill={bill} />
          {bill.payments.length === 0 ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">
              No payments linked yet
            </div>
          ) : (
            bill.payments.map((payment) => (
              <TransactionRow
                key={payment.id}
                transaction={payment.transaction as any}
                onClick={() => handleTransactionClick(payment.transaction)}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

export function BillsListLoading() {
  return (
    <div
      style={{ height: "calc(100vh - 44px - 44px)", overflow: "auto" }}
      className="relative w-full divide-y overflow-hidden"
    >
      <BillGroupHeaderLoading />
      {Array.from({ length: 3 }).map((_, index) => (
        <RowLoading key={index} />
      ))}
      <BillGroupHeaderLoading />
      {Array.from({ length: 2 }).map((_, index) => (
        <RowLoading key={`b-${index}`} />
      ))}
      <BillGroupHeaderLoading />
      {Array.from({ length: 4 }).map((_, index) => (
        <RowLoading key={`c-${index}`} />
      ))}
    </div>
  );
}
