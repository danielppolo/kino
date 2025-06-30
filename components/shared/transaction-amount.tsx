import React from "react";

import { Money } from "../ui/money";

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
      className={amount > 0 ? "text-emerald-600" : "undefined"}
    />
  );
};

export default TransactionAmount;
