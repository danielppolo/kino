import React, { memo } from "react";

import SelectableRow from "./selectable-row";
import TagBadges from "./tag-badges";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";
import TransactionRowTransferButton from "./transaction-row-transfer-button";

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
  return (
    <SelectableRow
      id={transaction.id!}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      active={active}
    >
      <div className="shrink grow truncate">
        <TransactionDescription transaction={transaction as any} />
      </div>
      <TransactionRowTransferButton transaction={transaction} />
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
    prevProps.transaction.amount_cents === nextProps.transaction.amount_cents &&
    prevProps.transaction.currency === nextProps.transaction.currency &&
    prevProps.transaction.date === nextProps.transaction.date &&
    prevProps.transaction.description === nextProps.transaction.description &&
    prevProps.transaction.label_id === nextProps.transaction.label_id &&
    prevProps.transaction.wallet_id === nextProps.transaction.wallet_id &&
    prevProps.transaction.transfer_id === nextProps.transaction.transfer_id &&
    prevProps.transaction.tag_ids?.join(",") ===
      nextProps.transaction.tag_ids?.join(",") &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.active === nextProps.active,
);
