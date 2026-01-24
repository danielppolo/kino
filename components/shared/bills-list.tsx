"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import BillGroupHeader, { BillGroupHeaderLoading } from "./bill-group-header";
import EmptyState from "./empty-state";
import TransactionRow from "./transaction-row";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { RowLoading } from "@/components/ui/row";
import { useCategories } from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { createClient } from "@/utils/supabase/client";
import { linkTransactionToBill } from "@/utils/supabase/mutations";
import { listBillsWithPayments } from "@/utils/supabase/queries";
import { BillWithPayments, Transaction } from "@/utils/supabase/types";

interface BillsListProps {
  walletId?: string;
}

export default function BillsList({ walletId }: BillsListProps) {
  const { openForm } = useTransactionForm();
  const queryClient = useQueryClient();
  const [, categoryMap] = useCategories();

  const { data: bills, isLoading } = useQuery<BillWithPayments[]>({
    queryKey: ["bills-with-payments", walletId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listBillsWithPayments(supabase, { walletId });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  // Get unassociated transactions for the wallet
  const { data: unassociatedTransactions } = useQuery({
    queryKey: ["unassociated-transactions", walletId],
    queryFn: async () => {
      if (!walletId) return [];
      const supabase = await createClient();
      // Get all transactions for this wallet, we'll filter by bill currency later
      const { data: transactions } = await supabase
        .from("transaction_list")
        .select("*")
        .eq("wallet_id", walletId)
        .eq("type", "expense")
        .order("date", { ascending: false });

      // Get associated transaction IDs
      const { data: associatedIds } = await supabase
        .from("bill_payments")
        .select("transaction_id");

      const associatedSet = new Set(
        associatedIds?.map((p) => p.transaction_id) ?? [],
      );

      // Filter out associated transactions
      return transactions?.filter((t) => !associatedSet.has(t.id!)) ?? [];
    },
    enabled: !!walletId,
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

  const linkMutation = useMutation({
    mutationFn: async ({
      billId,
      transactionId,
    }: {
      billId: string;
      transactionId: string;
    }) => {
      await linkTransactionToBill(billId, transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["unassociated-transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-owed-amounts"] });
      toast.success("Transaction linked to bill");
    },
    onError: (error: Error) => {
      toast.error(`Failed to link transaction: ${error.message}`);
    },
  });

  const handleTransactionClick = (transaction: any) => {
    openForm({
      type: transaction.type,
      walletId: transaction.wallet_id,
      initialData: transaction as Transaction,
    });
  };

  const getTransactionOptionsForBill = (bill: BillWithPayments) => {
    if (!unassociatedTransactions) return [];

    // Filter transactions by bill currency
    const filtered = unassociatedTransactions.filter(
      (t) => t.currency === bill.currency,
    );

    return filtered.map((transaction): ComboboxOption => {
      const category = categoryMap.get(transaction.category_id ?? "");
      return {
        value: transaction.id!,
        label: transaction.description || "No description",
        keywords: [
          transaction.description?.toLowerCase() ?? "",
          transaction.date ?? "",
          category?.name.toLowerCase() ?? "",
        ],
      };
    });
  };

  const getTransactionFromOption = (transactionId: string) => {
    return unassociatedTransactions?.find((t) => t.id === transactionId);
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
    <div className="relative h-full w-full divide-y overflow-auto">
      {sortedBills.map((bill) => {
        const transactionOptions = getTransactionOptionsForBill(bill);

        return (
          <div key={bill.id}>
            <BillGroupHeader bill={bill} />
            {bill.payments.length === 0 ? (
              <div className="flex flex-col gap-2 px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  No payments linked yet
                </span>
                {transactionOptions.length > 0 ? (
                  <Combobox
                    variant="outline"
                    size="sm"
                    options={transactionOptions}
                    value=""
                    onChange={(transactionId) => {
                      if (transactionId) {
                        linkMutation.mutate({
                          billId: bill.id,
                          transactionId,
                        });
                      }
                    }}
                    placeholder="Link a transaction..."
                    searchPlaceholder="Search transactions..."
                    className="w-full"
                    renderOption={(option) => {
                      const transaction = getTransactionFromOption(
                        option.value,
                      );
                      if (!transaction) return option.label;

                      const category = categoryMap.get(
                        transaction.category_id ?? "",
                      );
                      return (
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {category && (
                              <span className="text-base">{category.icon}</span>
                            )}
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-medium">
                                {transaction.description || "No description"}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {format(
                                  new Date(`${transaction.date}T00:00:00`),
                                  "PP",
                                )}
                              </span>
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: transaction.currency ?? "USD",
                            }).format(
                              Math.abs(transaction.amount_cents ?? 0) / 100,
                            )}
                          </span>
                        </span>
                      );
                    }}
                  />
                ) : (
                  <span className="text-muted-foreground text-xs italic">
                    No available transactions to link
                  </span>
                )}
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
        );
      })}
    </div>
  );
}

export function BillsListLoading() {
  return (
    <div className="relative h-full w-full divide-y overflow-auto">
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
