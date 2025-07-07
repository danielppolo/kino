import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    const { error: balanceError } = await supabase.rpc(
      "backfill_wallet_monthly_balances",
    );
    if (balanceError) throw balanceError;

    const { error: statsError } = await supabase.rpc(
      "backfill_monthly_stats_with_transfers",
    );
    if (statsError) throw statsError;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Monthly backfill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
