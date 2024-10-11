import React from "react";

import { Button } from "../ui/button";
import Color from "./color";
import LabelPicker from "./label-picker";

import { Transaction } from "@/utils/supabase/types";

interface TransactionColorProps {
  transaction: Transaction;
  onUpdate: (transaction: Transaction, updates: Partial<Transaction>) => void;
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
