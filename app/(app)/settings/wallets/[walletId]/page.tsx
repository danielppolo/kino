import CsvTransactionUploader from "./(components)/import-transactions";

import { listCategories, listLabels } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export default async function Page({
  params,
}: {
  params: { walletId: string };
}) {
  const supabase = createClient();
  const { data: labels, error: labelsError } = await listLabels(supabase);
  const { data: categories, error: categoriesError } =
    await listCategories(supabase);

  if (labelsError || categoriesError) {
    throw labelsError || categoriesError;
  }

  return (
    <div>
      <h1>Wallet</h1>
      <h2>Labels</h2>
      <h2>Members</h2>
      <h2>Configuration</h2>
      <ul>
        <li>Visibility</li>
        <li>Currency</li>
      </ul>
      <h2>Export</h2>
      <h2>Import</h2>
      <CsvTransactionUploader
        walletId={params.walletId}
        labels={labels}
        categories={categories}
      />
    </div>
  );
}
