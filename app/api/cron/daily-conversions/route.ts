import { NextRequest, NextResponse } from "next/server";

import { fetchAllConversions } from "@/utils/fetch-conversions-server";

export async function POST(request: NextRequest) {
  // Protect from calls not being a cron job
  if (
    request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all conversions
    const conversions = await fetchAllConversions({
      currencies: ["EUR", "USD"],
      baseCurrency: "MXN",
      date: new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    });

    return NextResponse.json({
      success: true,
      conversions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Daily conversions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
