import LabelSection from "./(components)/labels-section";

import { listLabels } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const supabase = createClient();
  const { data, error } = await listLabels(supabase);

  if (error) {
    throw error;
  }

  return (
    <div className="w-full">
      <h1>Labels</h1>

      <LabelSection data={data} />
    </div>
  );
}
