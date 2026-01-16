"use client";

import { useQuery } from "@tanstack/react-query";

import RecurringTransactionRow from "./recurring-transaction-row";

import EmptyState from "@/components/shared/empty-state";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { createClient } from "@/utils/supabase/client";
import { listRecurringTransactions } from "@/utils/supabase/queries";
import { RecurringTransaction } from "@/utils/supabase/types";

interface Props {
  type: "income" | "expense";
  onEdit: (t: RecurringTransaction) => void;
  isActive: boolean;
}

export default function RecurringTransactionsSection({
  type,
  onEdit,
  isActive,
}: Props) {
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
    return (
      <EmptyState
        title="No transactions found"
        description="Please try again or add a new transaction."
      />
    );
  }

  // Sort by next_run_date || start_date
  const sortedData = [...data].sort((a, b) => {
    const dateA = a.next_run_date || a.start_date;
    const dateB = b.next_run_date || b.start_date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: sortedData,
    getItemId: (transaction) => transaction.id,
    onEnter: onEdit,
    enabled: isActive,
  });

  return sortedData.map((transaction) => (
    <RecurringTransactionRow
      key={transaction.id}
      transaction={transaction}
      onClick={() => {
        setActiveId(transaction.id);
        onEdit(transaction);
      }}
      active={transaction.id === activeId}
    />
  ));
}
