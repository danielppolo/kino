import TransactionList from "@/components/shared/transaction-list";
import {
  Filters,
  listCategories,
  listLabels,
  listTransactions,
} from "@/utils/supabase/queries";
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
  const { data: labels, error: labelsError } = await listLabels(supabase);
  const { data: categories, error: categoriesError } =
    await listCategories(supabase);

  if (transactionsError || labelsError || categoriesError) {
    throw transactionsError || labelsError || categoriesError;
  }

  return (
    <TransactionList
      walletId={walletId}
      transactions={transactions}
      labels={labels}
      categories={categories}
    />
  );
}
