import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import TransactionList from "@/components/shared/transaction-list";

export const dynamic = "force-dynamic";

export default async function Page() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionList />
    </HydrationBoundary>
  );
}
