import TransactionList from "@/components/shared/transaction-list";
import { Filters, listTransactions } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface PageParams {
  searchParams: Filters;
}

// Time in seconds
export const revalidate = 60;

export default async function Page({ searchParams }: PageParams) {
  const supabase = await createClient();
  const { data: transactions, error: transactionsError } =
    await listTransactions(supabase, {
      ...(await searchParams),
    });

  if (transactionsError) {
    throw transactionsError;
  }

  return <TransactionList transactions={transactions} />;
}
