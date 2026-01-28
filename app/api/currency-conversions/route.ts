import { NextResponse } from "next/server";
import { fetchAllConversions } from "@/utils/fetch-conversions-server";

export async function POST(request: Request) {
  try {
    const { currencies, baseCurrency } = await request.json();

    if (!currencies || !baseCurrency) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const conversions = await fetchAllConversions({
      currencies,
      baseCurrency,
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
