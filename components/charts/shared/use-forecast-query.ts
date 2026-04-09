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

function normalizeWalletIds(walletIds: string[]) {
  return [...walletIds].sort();
}

function normalizeConversionRates(
  conversionRates: UseForecastQueryParams["conversionRates"],
) {
  return Object.fromEntries(
    Object.entries(conversionRates)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, value]) => [
        currency,
        {
          rate: value.rate,
          lastUpdated: value.lastUpdated ?? null,
          source: value.source ?? null,
        },
      ]),
  );
}

export function useForecastQuery({
  walletId,
  walletIds,
  horizonMonths,
  baseCurrency,
  conversionRates,
}: UseForecastQueryParams) {
  const normalizedWalletIds = normalizeWalletIds(walletIds);
  const normalizedConversionRates = normalizeConversionRates(conversionRates);

  return useQuery({
    queryKey: [
      "forecast",
      {
        walletId: walletId ?? null,
        walletIds: normalizedWalletIds,
        horizonMonths,
        baseCurrency,
        conversionRates: normalizedConversionRates,
      },
    ],
    queryFn: async (): Promise<ForecastApiResponse> => {
      if (horizonMonths <= 0) {
        return {
          forecast: [],
          avgMonthlyBurn: 0,
          metadata: {
            trainingMonths: 0,
            method: "disabled",
            recoveryDetected: false,
          },
        };
      }
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: walletId ?? null,
          walletIds: normalizedWalletIds,
          horizon: horizonMonths,
          baseCurrency,
          conversionRates: normalizedConversionRates,
        }),
      });
      if (!res.ok) throw new Error("Forecast API failed");
      return res.json();
    },
    enabled: horizonMonths > 0 && normalizedWalletIds.length > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    meta: {
      persist: true,
    },
  });
}
