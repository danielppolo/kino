import { NextResponse } from "next/server";

import { processRecurringTransactions } from "@/actions/process-recurring-transactions";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processRecurringTransactions(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to run recurring",
      },
      { status: 500 },
    );
  }
}
