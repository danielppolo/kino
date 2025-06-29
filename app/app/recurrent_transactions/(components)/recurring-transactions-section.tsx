"use client";

import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import { listRecurringTransactions } from "@/utils/supabase/queries";
import { RecurringTransaction } from "@/utils/supabase/types";

interface Props {
  walletId?: string;
  onEdit: (t: RecurringTransaction) => void;
}

export default function RecurringTransactionsSection({ walletId, onEdit }: Props) {
  const { data } = useQuery({
    queryKey: ["recurring-transactions", walletId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await listRecurringTransactions(supabase, { walletId });
      if (error) throw error;
      return data as RecurringTransaction[];
    },
  });

  if (!data) return null;

  return (
    <Table>
      <TableBody>
        {data.map((t) => (
          <TableRow key={t.id} onClick={() => onEdit(t)} className="cursor-pointer">
            <TableCell>{t.description}</TableCell>
            <TableCell>{t.interval_type}</TableCell>
            <TableCell>
              {(t.amount_cents / 100).toFixed(2)} {t.currency}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
