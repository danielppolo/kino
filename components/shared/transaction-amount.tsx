import React from "react";

import { Text } from "../ui/typography";

import { formatCents } from "@/utils/format-cents";

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
    <Text
      as="span"
      destructive={amount < 0}
      className={amount > 0 ? "text-emerald-600" : undefined}
    >
      {formatCents(amount)}
    </Text>
  );
};

export default TransactionAmount;
