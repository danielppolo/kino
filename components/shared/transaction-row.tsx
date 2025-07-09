import React, { memo } from "react";

import SelectableRow from "./selectable-row";
import TagBadges from "./tag-badges";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";

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
    <SelectableRow
      id={transaction.id!}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    >
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
    </SelectableRow>
  );
}

export default memo(
  TransactionRow,
  (prevProps, nextProps) =>
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode,
);
