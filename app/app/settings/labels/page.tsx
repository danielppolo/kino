import { prefetchQuery } from "@supabase-cache-helpers/postgrest-react-query";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import LabelSection from "./(components)/labels-section";

import { listLabels } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const supabase = createClient();
  const queryClient = new QueryClient();

  await prefetchQuery(queryClient, listLabels(supabase));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="w-full">
        <h1>Labels</h1>

        <LabelSection />
      </div>
    </HydrationBoundary>
  );
}
