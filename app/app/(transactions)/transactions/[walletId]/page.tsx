import TransactionList from "@/components/shared/transaction-list";
import { PAGE_SIZE } from "@/utils/constants";
import { Filters, listTransactions } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface PageParams {
  params: { walletId: string };
  searchParams: Promise<Filters>;
}

export default async function Page({ params, searchParams }: PageParams) {
  const { walletId } = await params;
  const filters = await searchParams;
  const supabase = await createClient();
  const { data: initialTransactions, error: transactionsError } =
    await listTransactions(supabase, {
      wallet_id: walletId,
      ...filters,
      page: 0,
      pageSize: PAGE_SIZE,
    });
  if (transactionsError) {
    throw transactionsError;
  }

  return (
    <TransactionList
      initialTransactions={initialTransactions || []}
      filters={{
        wallet_id: walletId,
        ...filters,
      }}
    />
  );
}
