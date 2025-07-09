"use client";

import { useQuery } from "@tanstack/react-query";

import RecurringTransactionRow from "./recurring-transaction-row";

import EmptyState from "@/components/shared/empty-state";
import { createClient } from "@/utils/supabase/client";
import { listRecurringTransactions } from "@/utils/supabase/queries";
import { RecurringTransaction } from "@/utils/supabase/types";

interface Props {
  type: "income" | "expense";
  onEdit: (t: RecurringTransaction) => void;
}

export default function RecurringTransactionsSection({ type, onEdit }: Props) {
  const { data } = useQuery({
    queryKey: ["recurring-transactions", type],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await listRecurringTransactions(supabase, {
        type,
      });
      if (error) throw error;
      return data as unknown as RecurringTransaction[];
    },
  });

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  // Sort by next_run_date || start_date
  const sortedData = [...data].sort((a, b) => {
    const dateA = a.next_run_date || a.start_date;
    const dateB = b.next_run_date || b.start_date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  return (
    <div className="divide-y">
      {sortedData.map((transaction) => (
        <RecurringTransactionRow
          key={transaction.id}
          transaction={transaction}
          onClick={() => onEdit(transaction)}
        />
      ))}
    </div>
  );
}
