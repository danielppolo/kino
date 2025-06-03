import React from "react";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { IncomeAreaChart } from "@/components/charts/income-area-chart";
import { TransactionsAreaChart } from "@/components/charts/transactions-area-chart";
import {
  Filters,
  getWalletMonthlyBalances,
  listTransactions,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import { TransactionList } from "@/utils/supabase/types";

interface PageParams {
  params: { walletId: string };
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ params, searchParams }: PageParams) {
  const { walletId } = await params;
  const filters = await searchParams;
  const supabase = await createClient();

  const [
    { data: transactions, error: transactionsError },
    { data: monthlyBalances, error: monthlyBalancesError },
  ] = await Promise.all([
    listTransactions(supabase, {
      wallet_id: walletId,
      ...filters,
    }),
    getWalletMonthlyBalances(supabase, {
      walletId,
      from: filters.from,
      to: filters.to,
    }),
  ]);

  if (transactionsError) {
    throw transactionsError;
  }

  if (monthlyBalancesError) {
    throw monthlyBalancesError;
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="md:col-span-2 lg:col-span-3">
        <AccumulatedAreaChart monthlyBalances={monthlyBalances ?? []} />
      </div>
      <TransactionsAreaChart transactions={transactions as TransactionList[]} />
      <IncomeAreaChart transactions={transactions as TransactionList[]} />
    </div>
  );
}

export default InfographicsPage;
