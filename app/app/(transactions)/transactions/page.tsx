import TransactionList from "@/components/shared/transaction-list";
import { PAGE_SIZE } from "@/utils/constants";
import { Filters, listTransactions } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface PageParams {
  searchParams: Promise<Filters>;
}

// Time in seconds
// export const revalidate = 60;

export default async function Page({ searchParams }: PageParams) {
  const filters = await searchParams;
  const supabase = await createClient();
  const { data: initialTransactions, error: transactionsError } =
    await listTransactions(supabase, {
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
      filters={filters}
    />
  );
}
