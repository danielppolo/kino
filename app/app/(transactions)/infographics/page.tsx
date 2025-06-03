import React from "react";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { CashflowAreaChart } from "@/components/charts/cashflow-area-chart";
import {
  Filters,
  getMonthlyStats,
  getWalletMonthlyBalances,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

interface PageParams {
  params: { walletId: string };
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ searchParams }: PageParams) {
  const filters = await searchParams;
  const supabase = await createClient();

  const [
    { data: monthlyStats, error: monthlyStatsError },
    { data: monthlyBalances, error: monthlyBalancesError },
  ] = await Promise.all([
    getMonthlyStats(supabase, {
      from: filters.from,
      to: filters.to,
    }),
    getWalletMonthlyBalances(supabase, {
      from: filters.from,
      to: filters.to,
    }),
  ]);

  if (monthlyStatsError) {
    throw monthlyStatsError;
  }

  if (monthlyBalancesError) {
    throw monthlyBalancesError;
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="md:col-span-2 lg:col-span-3">
        <AccumulatedAreaChart monthlyBalances={monthlyBalances ?? []} />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <CashflowAreaChart monthlyStats={monthlyStats ?? []} />
      </div>
    </div>
  );
}

export default InfographicsPage;
