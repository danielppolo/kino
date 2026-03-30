"use client";

import { useQuery } from "@tanstack/react-query";

import type { ForecastApiResponse } from "@/app/api/forecast/route";

interface UseForecastQueryParams {
  walletId?: string;
  walletIds: string[];
  horizonMonths: number;
  baseCurrency: string;
  conversionRates: Record<
    string,
    { rate: number; lastUpdated?: string; source?: string }
  >;
}

export function useForecastQuery({
  walletId,
  walletIds,
  horizonMonths,
  baseCurrency,
  conversionRates,
}: UseForecastQueryParams) {
  return useQuery({
    queryKey: [
      "forecast",
      {
        walletId: walletId ?? null,
        walletIds,
        horizonMonths,
        baseCurrency,
        conversionRates,
      },
    ],
    queryFn: async (): Promise<ForecastApiResponse> => {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: walletId ?? null,
          walletIds,
          horizon: horizonMonths,
          baseCurrency,
          conversionRates,
        }),
      });
      if (!res.ok) throw new Error("Forecast API failed");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}
