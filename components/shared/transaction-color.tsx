import React from "react";

import { Button } from "../ui/button";
import Color from "./color";
import LabelPicker from "./label-picker";

import { Transaction } from "@/utils/supabase/types";

interface TransactionColorProps {
  transaction: Transaction;
  onUpdate: (transaction: Transaction, updates: Partial<Transaction>) => void;
}

export function TransactionColorIcon({ color }: { color?: string | null }) {
  return (
    <Color
      size="sm"
      color={color ?? "currentColor"}
      className="text-muted-foreground"
    />
  );
}

const TransactionColor: React.FC<TransactionColorProps> = ({
  transaction,
  onUpdate,
}) => {
  if (transaction.type === "transfer") {
    return (
      <Button variant="ghost" size="sm">
        <Color size="sm" color="gray" />
      </Button>
    );
  }

  return (
    <LabelPicker
      value={transaction.label_id}
      onChange={(id: string) => {
        onUpdate(transaction, { label_id: id });
      }}
    />
  );
};

export default TransactionColor;
