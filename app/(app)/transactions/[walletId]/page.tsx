import TransactionList from "@/components/shared/transaction-list";
import { Filters, listTransactions } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface PageParams {
  params: { walletId: string };
  searchParams: Filters;
}

export default async function Page({
  params: { walletId },
  searchParams,
}: PageParams) {
  const supabase = createClient();
  const { data: transactions, error: transactionsError } =
    await listTransactions(supabase, {
      wallet_id: walletId,
      ...searchParams,
    });
  if (transactionsError) {
    throw transactionsError;
  }

  return <TransactionList walletId={walletId} transactions={transactions} />;
}
