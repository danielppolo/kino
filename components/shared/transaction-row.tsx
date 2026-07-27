"use client";

import React, { memo } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import CategoryCombobox from "./category-combobox";
import Color from "./color";
import LabelCombobox from "./label-combobox";
import SelectableRow from "./selectable-row";
import TagBadges from "./tag-badges";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";

import { updateTransactions } from "@/actions/update-transactions";
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
    mutationFn: async (
      updates: Partial<Pick<TransactionList, "category_id" | "label_id">>,
    ) => {
      const result = await updateTransactions([transaction.id!], updates);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update transaction: ${error.message}`);
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
              type={transaction.type ?? undefined}
              value={null}
              onChange={(categoryId) => {
                if (categoryId) {
                  updateMutation.mutate({ category_id: categoryId });
                }
              }}
              placeholder="Add category"
              className="text-muted-foreground h-6 w-auto border-dashed px-2"
            />
          </div>
        )}
        <TransactionDescription transaction={transaction} />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <TagBadges transaction={transaction} />
        {!transaction.label_id && (
          <div className="hidden md:block" onClick={stopRowClick}>
            <LabelCombobox
              aria-label="Add label"
              comboboxVariant="icon"
              size="sm"
              variant="ghost"
              value={null}
              onChange={(labelId) => {
                if (labelId) {
                  updateMutation.mutate({ label_id: labelId });
                }
              }}
              icon={<Color size="sm" className="size-2" />}
              className="size-6 p-0"
            />
          </div>
        )}
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
