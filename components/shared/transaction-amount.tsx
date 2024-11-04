import React from "react";

import { Text } from "../ui/typography";

import { cn } from "@/lib/utils";
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
    <div className={cn("flex items-center gap-1", className)}>
      <Text as="span" muted>
        {currency}
      </Text>
      <Text
        as="span"
        destructive={amount < 0}
        className={amount > 0 ? "text-emerald-600" : undefined}
      >
        {formatCents(amount)}
      </Text>
    </div>
  );
};

export default TransactionAmount;
