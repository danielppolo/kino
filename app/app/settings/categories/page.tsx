import { prefetchQuery } from "@supabase-cache-helpers/postgrest-react-query";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import CategorySection from "./(components)/category-section";

import { listCategories } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const supabase = createClient();
  const queryClient = new QueryClient();

  await prefetchQuery(queryClient, listCategories(supabase));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="w-full">
        <h1>Categories</h1>

        <CategorySection type="income" title="Income" />
        <CategorySection type="expense" title="Expense" />
      </div>
    </HydrationBoundary>
  );
}
