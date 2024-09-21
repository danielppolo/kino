import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import AddTransactionButton from "@/components/shared/add-transaction-button";
import CategoryFilter from "@/components/shared/category-filter";
import DateRangeFilter from "@/components/shared/date-range-filter";
import SubjectFilter from "@/components/shared/subject-filter";
import TransactionList from "@/components/shared/transaction-list";

const ITEMS_PER_PAGE = 10;

export const dynamic = "force-dynamic";

export default async function Page() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Transaction Dashboard</h1>
          <AddTransactionButton />
        </div>

        {/* <Stats /> */}

        <DateRangeFilter />
        <SubjectFilter />
        <CategoryFilter />

        <TransactionList />
      </div>
    </HydrationBoundary>
  );
}
