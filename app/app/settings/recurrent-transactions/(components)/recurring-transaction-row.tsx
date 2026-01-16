"use client";

import { format } from "date-fns";

import TransactionAmount from "@/components/shared/transaction-amount";
import TransactionDescription from "@/components/shared/transaction-description";
import { Badge } from "@/components/ui/badge";
import Row from "@/components/ui/row";
import { useWallets } from "@/contexts/settings-context";
import { RecurringTransaction } from "@/utils/supabase/types";
import { CalendarFold, RefreshCcw } from "lucide-react";

interface RecurringTransactionRowProps {
  transaction: RecurringTransaction;
  onClick: () => void;
  active?: boolean;
}

export default function RecurringTransactionRow({
  transaction,
  onClick,
  active = false,
}: RecurringTransactionRowProps) {
  const [, walletMap] = useWallets();
  return (
    <Row onClick={onClick} className={active ? "bg-accent/50" : undefined}>
      <div className="shrink grow truncate">
        <TransactionDescription transaction={transaction as any} />
      </div>
      <div className="shrink-0">
        <div className="relative hidden flex-wrap items-center gap-1 md:flex">
          <Badge
            variant="outline"
            className="bg-background cursor-pointer gap-1 text-xs"
          >
            <CalendarFold className="size-3" />
            {transaction.next_run_date
              ? format(
                  new Date(`${transaction.next_run_date}T00:00:00`),
                  "MMM d",
                )
              : format(new Date(`${transaction.start_date}T00:00:00`), "MMM d")}
          </Badge>
          <Badge
            variant="outline"
            className="bg-background cursor-pointer gap-1 text-xs"
          >
            <RefreshCcw className="size-3" />
            {transaction.interval_type}
          </Badge>
          <Badge
            variant="outline"
            className="bg-background cursor-pointer text-xs"
          >
            {walletMap.get(transaction.wallet_id)?.name}
          </Badge>
        </div>
      </div>
      <div className="shrink-0">
        <TransactionAmount
          className="text-right"
          amount={transaction.amount_cents!}
          currency={transaction.currency!}
        />
      </div>
    </Row>
  );
}
