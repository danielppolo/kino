import React from "react";

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
      <span className="text-muted-foreground/50">{currency}</span>
      <span className={amount > 0 ? "text-emerald-600" : "text-red-500"}>
        {formatCents(amount)}
      </span>
    </div>
  );
};

export default TransactionAmount;
