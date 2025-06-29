import React, { memo } from "react";

import TagBadges from "./tag-badges";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";
import { Checkbox } from "../ui/checkbox";

import { TransactionList } from "@/utils/supabase/types";

interface TransactionRowProps {
  transaction: TransactionList;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
}

export function TransactionRow({
  transaction,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: TransactionRowProps) {
  return (
    <div
      id={transaction.id!}
      className="group hover:bg-accent/50 flex h-10 cursor-pointer items-center gap-2 px-4"
      onClick={onClick}
    >
      <div
        className={`mr-2 shrink-0 ${
          selected || selectionMode
            ? "visible"
            : "invisible group-hover:visible"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect?.();
        }}
      >
        <Checkbox checked={selected} aria-label="Select" />
      </div>
      <div className="shrink grow truncate">
        <TransactionDescription transaction={transaction as any} />
      </div>
      <div className="shrink-0">
        <TagBadges transaction={transaction} />
      </div>
      <div className="shrink-0">
        <TransactionAmount
          className="text-right"
          amount={transaction.amount_cents!}
          currency={transaction.currency!}
        />
      </div>
    </div>
  );
}

export function TransactionRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
    </div>
  );
}

export default memo(
  TransactionRow,
  (prevProps, nextProps) =>
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode,
);
