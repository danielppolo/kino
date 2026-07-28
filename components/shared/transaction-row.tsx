"use client";

import React, { memo } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import CategoryCombobox from "./category-combobox";
import SelectableRow from "./selectable-row";
import TagBadges from "./tag-badges";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";

import { updateTransactions } from "@/actions/update-transactions";
import {
  type InfiniteTransactionData,
  patchOptimisticTransaction,
} from "@/utils/optimistic-transactions";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { TransactionList } from "@/utils/supabase/types";

interface TransactionRowProps {
  transaction: TransactionList;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
  active?: boolean;
}

type TransactionFieldUpdates = Partial<
  Pick<TransactionList, "category_id" | "label_id">
>;

export function TransactionRow({
  transaction,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  active = false,
}: TransactionRowProps) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: async (updates: TransactionFieldUpdates) => {
      const result = await updateTransactions([transaction.id!], updates);
      if (result.error) throw new Error(result.error);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });

      const previousQueries =
        queryClient.getQueriesData<InfiniteTransactionData>({
          queryKey: ["transactions"],
        });

      const nextCategoryId =
        updates.category_id !== undefined
          ? updates.category_id
          : transaction.category_id;
      const nextLabelId =
        updates.label_id !== undefined
          ? updates.label_id
          : transaction.label_id;

      queryClient.setQueriesData<InfiniteTransactionData>(
        { queryKey: ["transactions"] },
        (old) =>
          patchOptimisticTransaction(old, transaction.id!, {
            ...updates,
            needs_review: !nextCategoryId || !nextLabelId,
          }),
      );

      return { previousQueries };
    },
    onError: (error, _updates, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(`Failed to update transaction: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Transaction updated");
    },
    onSettled: () => {
      void invalidateWorkspaceQueries(queryClient);
    },
  });

  const stopRowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <SelectableRow
      id={transaction.id!}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      active={active}
    >
      <div className="flex shrink grow items-center gap-1 truncate">
        {!transaction.category_id && (
          <div onClick={stopRowClick}>
            <CategoryCombobox
              selectionType="combobox"
              size="sm"
              variant="ghost"
              type={transaction.type ?? undefined}
              value={null}
              onChange={(categoryId) => {
                if (categoryId) {
                  updateMutation.mutate({ category_id: categoryId });
                }
              }}
              placeholder="Add category"
              className="text-muted-foreground h-auto w-auto rounded-none bg-transparent p-0 underline decoration-dashed underline-offset-4 hover:bg-transparent"
            />
          </div>
        )}
        <TransactionDescription transaction={transaction} />
      </div>
      <div className="shrink-0">
        <TagBadges
          transaction={transaction}
          onAssignLabel={(labelId) =>
            updateMutation.mutate({ label_id: labelId })
          }
        />
      </div>
      <div className="shrink-0">
        <TransactionAmount
          className="text-right"
          amount={transaction.amount_cents!}
          currency={transaction.currency!}
        />
      </div>
    </SelectableRow>
  );
}

export default memo(
  TransactionRow,
  (prevProps, nextProps) =>
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.amount_cents === nextProps.transaction.amount_cents &&
    prevProps.transaction.category_id === nextProps.transaction.category_id &&
    prevProps.transaction.currency === nextProps.transaction.currency &&
    prevProps.transaction.date === nextProps.transaction.date &&
    prevProps.transaction.description === nextProps.transaction.description &&
    prevProps.transaction.label_id === nextProps.transaction.label_id &&
    JSON.stringify(prevProps.transaction.ontology_associations) ===
      JSON.stringify(nextProps.transaction.ontology_associations) &&
    prevProps.transaction.wallet_id === nextProps.transaction.wallet_id &&
    prevProps.transaction.transfer_id === nextProps.transaction.transfer_id &&
    prevProps.transaction.tag_ids?.join(",") ===
      nextProps.transaction.tag_ids?.join(",") &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.active === nextProps.active,
);
