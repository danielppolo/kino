"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Text } from "../ui/typography";
import BillGroupHeader, { BillGroupHeaderLoading } from "./bill-group-header";
import EmptyState from "./empty-state";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";
import TransactionMultiSelect from "./transaction-multi-select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import Row, { RowLoading } from "@/components/ui/row";
import { useCategories } from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import {
  linkTransactionsToBill,
  splitTransaction,
  unlinkTransactionFromBill,
} from "@/utils/supabase/mutations";
import { listBillsWithPayments } from "@/utils/supabase/queries";
import { BillWithPayments, Transaction } from "@/utils/supabase/types";

interface BillsListProps {
  walletId?: string;
}

interface SplitConfirmation {
  billId: string;
  transactionId: string;
  transactionAmount: number;
  billRemainingAmount: number;
  otherTransactionIds: string[];
}

export default function BillsList({ walletId }: BillsListProps) {
  const { openForm } = useTransactionForm();
  const queryClient = useQueryClient();
  const [, categoryMap] = useCategories();
  const [splitConfirmation, setSplitConfirmation] =
    useState<SplitConfirmation | null>(null);
  const [transactionSelectKey, setTransactionSelectKey] = useState(0);

  const { data: bills, isLoading } = useQuery<BillWithPayments[]>({
    queryKey: ["bills-with-payments", walletId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listBillsWithPayments(supabase, { walletId });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  console.log(bills);

  // Get all income transactions for the wallet
  const { data: allIncomeTransactions } = useQuery({
    queryKey: ["income-transactions", walletId],
    queryFn: async () => {
      if (!walletId) return [];
      const supabase = await createClient();
      // Get all income transactions for this wallet, we'll filter by bill currency later
      const { data: transactions } = await supabase
        .from("transaction_list")
        .select("*")
        .eq("wallet_id", walletId)
        .eq("type", "income")
        .order("date", { ascending: false });

      return transactions ?? [];
    },
    enabled: !!walletId,
  });

  // Calculate associated transaction IDs from bills with payments
  const associatedTransactionIds = useMemo(() => {
    if (!bills) return new Set<string>();
    const ids = new Set<string>();
    bills.forEach((bill) => {
      bill.payments.forEach((payment) => {
        if (payment.transaction?.id) {
          ids.add(payment.transaction.id);
        }
      });
    });
    return ids;
  }, [bills]);

  // Filter out associated transactions using bills data
  const unassociatedTransactions = useMemo(() => {
    if (!allIncomeTransactions) return [];
    return allIncomeTransactions.filter(
      (t) => !associatedTransactionIds.has(t.id!),
    );
  }, [allIncomeTransactions, associatedTransactionIds]);

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
      transactionIds,
    }: {
      billId: string;
      transactionIds: string[];
    }) => {
      await linkTransactionsToBill(billId, transactionIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["unassociated-transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["income-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-owed-amounts"] });
      const count = variables.transactionIds.length;
      toast.success(
        `${count} transaction${count > 1 ? "s" : ""} linked to bill`,
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to link transactions: ${error.message}`);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async ({
      billId,
      transactionId,
    }: {
      billId: string;
      transactionId: string;
    }) => {
      await unlinkTransactionFromBill(billId, transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["unassociated-transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["income-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-owed-amounts"] });
      toast.success("Transaction unlinked from bill");
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink transaction: ${error.message}`);
    },
  });

  const splitAndLinkMutation = useMutation({
    mutationFn: async ({
      billId,
      transactionId,
      splitAmount,
      otherTransactionIds,
    }: {
      billId: string;
      transactionId: string;
      splitAmount: number;
      otherTransactionIds: string[];
    }) => {
      // Split the transaction
      const { matchingTransactionId } = await splitTransaction(
        transactionId,
        splitAmount,
      );

      // Link all transactions (split one + others)
      const allTransactionIds = [matchingTransactionId, ...otherTransactionIds];
      await linkTransactionsToBill(billId, allTransactionIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["unassociated-transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["income-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-owed-amounts"] });
      toast.success("Transaction split and linked to bill");
      setSplitConfirmation(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to split and link transaction: ${error.message}`);
      setSplitConfirmation(null);
    },
  });

  const handleTransactionClick = (transaction: any) => {
    openForm({
      type: transaction.type,
      walletId: transaction.wallet_id,
      initialData: transaction as Transaction,
    });
  };

  const getAvailableTransactionsForBill = (bill: BillWithPayments) => {
    if (!unassociatedTransactions) return [];

    // Filter transactions by bill currency
    return unassociatedTransactions.filter((t) => t.currency === bill.currency);
  };

  const handleLinkTransactions = (
    billId: string,
    bill: BillWithPayments,
    transactionIds: string[],
  ) => {
    if (transactionIds.length === 0) return;

    // Calculate remaining bill amount
    const remainingAmount = bill.amount_cents - bill.paid_amount_cents;

    // Find if any transaction needs to be split
    const transactionNeedingSplit = transactionIds.find((id) => {
      const transaction = allIncomeTransactions?.find((t) => t.id === id);
      return transaction && transaction.amount_cents > remainingAmount;
    });

    if (transactionNeedingSplit) {
      const transaction = allIncomeTransactions?.find(
        (t) => t.id === transactionNeedingSplit,
      );
      if (!transaction) return;

      // Show confirmation dialog
      setSplitConfirmation({
        billId,
        transactionId: transaction.id!,
        transactionAmount: transaction.amount_cents!,
        billRemainingAmount: remainingAmount,
        otherTransactionIds: transactionIds.filter(
          (id) => id !== transactionNeedingSplit,
        ),
      });
    } else {
      // Link all transactions without splitting
      linkMutation.mutate({ billId, transactionIds });
    }
  };

  const confirmSplit = () => {
    if (!splitConfirmation) return;

    splitAndLinkMutation.mutate({
      billId: splitConfirmation.billId,
      transactionId: splitConfirmation.transactionId,
      splitAmount: splitConfirmation.billRemainingAmount,
      otherTransactionIds: splitConfirmation.otherTransactionIds,
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
    <>
      <div className="relative h-full w-full divide-y overflow-auto">
        {sortedBills.map((bill) => {
          const availableTransactions = getAvailableTransactionsForBill(bill);

          return (
            <div key={bill.id}>
              <BillGroupHeader bill={bill} />
              <div className="flex flex-col">
                {/* Linked transactions */}
                {bill.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="group relative flex items-center"
                  >
                    <div className="flex-1">
                      <Row
                        onClick={() =>
                          handleTransactionClick(payment.transaction)
                        }
                      >
                        <div className="shrink grow truncate">
                          <TransactionDescription
                            transaction={payment.transaction as any}
                          />
                        </div>
                        <div className="shrink-0">
                          <Text muted>
                            {format(
                              new Date(payment.transaction.date!),
                              "MMM d, yyyy",
                            )}
                          </Text>
                          {/* <TagBadges transaction={payment.transaction as any} /> */}
                        </div>
                        <div className="shrink-0">
                          <TransactionAmount
                            className="text-right"
                            amount={payment.transaction.amount_cents!}
                            currency={payment.transaction.currency!}
                          />
                        </div>
                      </Row>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        unlinkMutation.mutate({
                          billId: bill.id,
                          transactionId: payment.transaction.id,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Link transactions section - only show if bill is not fully paid */}
                {bill.payment_percentage < 100 && (
                  <div className="flex flex-col gap-2 px-4 py-3">
                    {availableTransactions.length > 0 ? (
                      <TransactionMultiSelect
                        key={`${bill.id}-${transactionSelectKey}`}
                        transactions={availableTransactions as any}
                        value={[]}
                        onChange={(transactionIds) => {
                          // Force re-render to close the popover
                          setTransactionSelectKey((prev) => prev + 1);
                          // Small delay to ensure popover closes before dialog shows
                          setTimeout(() => {
                            handleLinkTransactions(
                              bill.id,
                              bill,
                              transactionIds,
                            );
                          }, 100);
                        }}
                        placeholder="Link transactions..."
                        className="w-full"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs italic">
                        {bill.payments.length === 0
                          ? "No available transactions to link"
                          : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Split confirmation dialog */}
      <AlertDialog
        open={!!splitConfirmation}
        onOpenChange={(open) => !open && setSplitConfirmation(null)}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay
            className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[200] bg-black/50",
            )}
          />
          <AlertDialogPrimitive.Content
            className={cn(
              "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[200] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
            )}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Split Transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                {splitConfirmation && (
                  <>
                    The selected transaction amount (
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: bills?.find(
                        (b) => b.id === splitConfirmation.billId,
                      )?.currency,
                    }).format(splitConfirmation.transactionAmount / 100)}
                    ) is greater than the remaining bill amount (
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: bills?.find(
                        (b) => b.id === splitConfirmation.billId,
                      )?.currency,
                    }).format(splitConfirmation.billRemainingAmount / 100)}
                    ).
                    <br />
                    <br />
                    The transaction will be split into two:
                    <br />• One matching the bill amount (
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: bills?.find(
                        (b) => b.id === splitConfirmation.billId,
                      )?.currency,
                    }).format(splitConfirmation.billRemainingAmount / 100)}
                    ) and linked to this bill
                    <br />• One with the remaining amount (
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: bills?.find(
                        (b) => b.id === splitConfirmation.billId,
                      )?.currency,
                    }).format(
                      (splitConfirmation.transactionAmount -
                        splitConfirmation.billRemainingAmount) /
                        100,
                    )}
                    )
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSplit}>
                Split & Link
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialog>
    </>
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
