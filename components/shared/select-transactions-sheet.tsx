"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import EmptyState from "./empty-state";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Money } from "@/components/ui/money";
import { RowLoading } from "@/components/ui/row";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCategories } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { linkTransactionsToBill } from "@/utils/supabase/mutations";
import { getUnassociatedTransactions } from "@/utils/supabase/queries";
import { TransactionList } from "@/utils/supabase/types";

interface SelectTransactionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  walletId: string;
  billCurrency: string;
}

export function SelectTransactionsSheet({
  open,
  onOpenChange,
  billId,
  walletId,
  billCurrency,
}: SelectTransactionsSheetProps) {
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const [, categoryMap] = useCategories();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["unassociated-transactions", walletId, billCurrency],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getUnassociatedTransactions(supabase, {
        walletId,
        billCurrency,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      await linkTransactionsToBill(billId, selectedTransactions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["unassociated-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-owed-amounts"] });
      toast.success(
        `${selectedTransactions.length} transaction${selectedTransactions.length > 1 ? "s" : ""} linked to bill`,
      );
      setSelectedTransactions([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to link transactions: ${error.message}`);
    },
  });

  const [comboboxValue, setComboboxValue] = useState("");

  const transactionMap = new Map<string, TransactionList>();
  transactions?.forEach((t) => transactionMap.set(t.id!, t));

  const selectedTransactionDetails = selectedTransactions
    .map((id) => transactionMap.get(id))
    .filter(Boolean) as TransactionList[];

  const availableTransactions =
    transactions?.filter((t) => !selectedTransactions.includes(t.id!)) ?? [];

  const options: ComboboxOption[] = availableTransactions.map((transaction) => {
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

  const handleTransactionSelect = (transactionId: string) => {
    if (transactionId && !selectedTransactions.includes(transactionId)) {
      setSelectedTransactions((prev) => [...prev, transactionId]);
      setComboboxValue(""); // Reset combobox after selection
    }
  };

  const removeTransaction = (transactionId: string) => {
    setSelectedTransactions((prev) =>
      prev.filter((id) => id !== transactionId),
    );
  };

  const handleSubmit = () => {
    if (selectedTransactions.length === 0) {
      toast.error("Please select at least one transaction");
      return;
    }
    linkMutation.mutate();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setSelectedTransactions([]);
        }
        onOpenChange(newOpen);
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Select Transactions</SheetTitle>
          <SheetDescription>
            Choose transactions to link to this bill. Only unassociated expense
            transactions are shown.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <RowLoading key={i} />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <EmptyState
              title="No transactions available"
              description="All expense transactions in this wallet are already linked to bills."
            />
          ) : (
            <>
              {/* Combobox to add transactions */}
              {availableTransactions.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Add Transaction
                  </label>
                  <Combobox
                    variant="outline"
                    size="default"
                    options={options}
                    value={comboboxValue}
                    onChange={handleTransactionSelect}
                    placeholder="Search and select a transaction..."
                    searchPlaceholder="Search by description, date, or category..."
                    className="w-full"
                    renderOption={(option) => {
                      const transaction = transactionMap.get(option.value);
                      if (!transaction) return option.label;

                      const category = categoryMap.get(
                        transaction.category_id ?? "",
                      );
                      return (
                        <span className="flex w-full items-center justify-between gap-3">
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {category && (
                              <span className="text-lg">{category.icon}</span>
                            )}
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium">
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
                          <Money
                            cents={Math.abs(transaction.amount_cents ?? 0)}
                            currency={transaction.currency ?? "USD"}
                            className="shrink-0 text-sm font-semibold"
                          />
                        </span>
                      );
                    }}
                  />
                </div>
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                  All available transactions have been selected.
                </div>
              )}

              {/* Selected transactions */}
              {selectedTransactionDetails.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Selected ({selectedTransactionDetails.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTransactionDetails.map((transaction) => {
                      const category = categoryMap.get(
                        transaction.category_id ?? "",
                      );
                      return (
                        <Badge
                          key={transaction.id}
                          variant="secondary"
                          className="flex items-center gap-2 pr-1"
                        >
                          <span className="flex items-center gap-1.5">
                            {category && (
                              <span className="text-sm">{category.icon}</span>
                            )}
                            <span className="max-w-[150px] truncate">
                              {transaction.description || "No description"}
                            </span>
                            <Money
                              cents={Math.abs(transaction.amount_cents ?? 0)}
                              currency={transaction.currency ?? "USD"}
                              className="text-xs"
                            />
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0.5 hover:bg-transparent"
                            onClick={() => removeTransaction(transaction.id!)}
                          >
                            <X className="size-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={linkMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              linkMutation.isPending ||
              selectedTransactions.length === 0 ||
              !transactions ||
              transactions.length === 0
            }
          >
            {linkMutation.isPending
              ? "Linking..."
              : selectedTransactions.length > 0
                ? `Link ${selectedTransactions.length} Transaction${selectedTransactions.length !== 1 ? "s" : ""}`
                : "Select Transactions"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
