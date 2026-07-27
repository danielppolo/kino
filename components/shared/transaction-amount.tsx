import React from "react";

import { Money } from "../ui/money";

import { cn } from "@/lib/utils";

interface TransactionAmountProps {
  amount: number;
  currency: string;
  className?: string;
}

const TransactionAmount: React.FC<TransactionAmountProps> = ({
  amount,
  currency,
  className,
}) => {
  return (
    <Money
      as="span"
      cents={amount}
      currency={currency}
      destructive={amount < 0}
      className={cn(
        "block whitespace-nowrap tabular-nums",
        amount > 0 && "text-emerald-600",
        className,
      )}
    />
  );
};

export default TransactionAmount;
