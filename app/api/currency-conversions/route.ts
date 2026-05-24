import { NextResponse } from "next/server";

import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import {
  createClient,
  createServiceRoleClient,
} from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { currencies, baseCurrency } = await request.json();

    if (!currencies || !baseCurrency) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceRoleSupabase = createServiceRoleClient();
    const conversions = await fetchAllConversions({
      currencies,
      baseCurrency,
      supabaseClient: serviceRoleSupabase,
    });

    return NextResponse.json({ conversions });
  } catch (error) {
    console.error("Error fetching currency conversions:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversions" },
      { status: 500 },
    );
  }
}
