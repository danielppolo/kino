import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { TransactionsAreaChart } from "@/components/charts/transactions-area-chart";
import AddTransactionButton from "@/components/shared/add-transaction-button";
import TransactionList from "@/components/shared/transaction-list";

export const dynamic = "force-dynamic";

export default async function Page() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto">
        <AddTransactionButton />

        {/* <Stats /> */}
        {/* <TransactionsAreaChart /> */}

        <TransactionList />
      </div>
    </HydrationBoundary>
  );
}
