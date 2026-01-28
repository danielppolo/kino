import React from "react";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { parseFeatureFlags, DEFAULT_FEATURE_FLAGS } from "@/utils/types/feature-flags";
import { createClient } from "@/utils/supabase/server";
import { AvgSpendingVsIncomeChart } from "@/components/charts/avg-spending-vs-income-chart";
import { BillBurdenRatioChart } from "@/components/charts/bill-burden-ratio-chart";
import { BillCoverageRatioChart } from "@/components/charts/bill-coverage-ratio-chart";
import { BillDebtFlowChart } from "@/components/charts/bill-debt-flow-chart";
import { BillPaymentRateChart } from "@/components/charts/bill-payment-rate-chart";
import { BillPaymentTimelineChart } from "@/components/charts/bill-payment-timeline-chart";
import { BillVelocityGaugeChart } from "@/components/charts/bill-velocity-gauge-chart";
import { BillsHistoryChart } from "@/components/charts/bills-history-chart";
import { BillsVsDiscretionaryChart } from "@/components/charts/bills-vs-discretionary-chart";
import { CashFlowAfterBillsChart } from "@/components/charts/cash-flow-after-bills-chart";
import { CurrencyExposureChart } from "@/components/charts/currency-exposure-chart";
import { ExpenseConcentrationChart } from "@/components/charts/expense-concentration-chart";
import { ExpensePredictabilityChart } from "@/components/charts/expense-predictability-chart";
import { ForecastLineChart } from "@/components/charts/forecast-line-chart";
import LabelPieChart from "@/components/charts/label-pie-chart";
import { TrendsChart } from "@/components/charts/trends-chart";
import { RecurringVsOnetimeBillsChart } from "@/components/charts/recurring-vs-onetime-bills-chart";
import { TagCloudAnalyticsChart } from "@/components/charts/tag-cloud-analytics-chart";
import { TransactionSizeDistributionChart } from "@/components/charts/transaction-size-distribution-chart";
import { TransactionTypeDistributionChart } from "@/components/charts/transaction-type-distribution-chart";
import { WalletNetBalanceLineChart } from "@/components/charts/wallet-net-balance-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filters } from "@/utils/supabase/queries";

interface PageParams {
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ searchParams }: PageParams) {
  const filters = await searchParams;

  // Fetch feature flags
  const supabase = await createClient();
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("feature_flags")
    .maybeSingle();

  const featureFlags = preferences?.feature_flags
    ? parseFeatureFlags(preferences.feature_flags)
    : DEFAULT_FEATURE_FLAGS;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Overview & Forecasting */}
      <div className="md:col-span-2 lg:col-span-4">
        <ForecastLineChart from={filters.from} to={filters.to} />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <AccumulatedAreaChart from={filters.from} to={filters.to} />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <AvgSpendingVsIncomeChart from={filters.from} to={filters.to} />
      </div>

      {/* Transaction Analysis */}
      <div className="md:col-span-2 lg:col-span-4">
        <TransactionTypeDistributionChart from={filters.from} to={filters.to} />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <TrendsChart
          variant="categories"
          from={filters.from}
          to={filters.to}
          type="expense"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <TrendsChart
          variant="categories"
          from={filters.from}
          to={filters.to}
          type="income"
        />
      </div>

      {/* Label Analysis */}
      <div className="md:col-span-2 lg:col-span-4">
        <TrendsChart
          variant="labels"
          from={filters.from}
          to={filters.to}
          type="expense"
          title="Expense Trends by Label"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <TrendsChart
          variant="labels"
          from={filters.from}
          to={filters.to}
          type="income"
          title="Income Trends by Label"
        />
      </div>
      <div className="col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Label</CardTitle>
          </CardHeader>
          <CardContent>
            <LabelPieChart from={filters.from} to={filters.to} type="expense" />
          </CardContent>
        </Card>
      </div>
      <div className="col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Income by label</CardTitle>
          </CardHeader>
          <CardContent>
            <LabelPieChart from={filters.from} to={filters.to} type="income" />
          </CardContent>
        </Card>
      </div>

      {/* Expense Analysis */}
      <div className="md:col-span-2 lg:col-span-2">
        <ExpenseConcentrationChart
          from={filters.from}
          to={filters.to}
          topN={5}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <TransactionSizeDistributionChart
          from={filters.from}
          to={filters.to}
          type="expense"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <TagCloudAnalyticsChart from={filters.from} to={filters.to} />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <CurrencyExposureChart from={filters.from} to={filters.to} />
      </div>

      {/* Transfer Analysis */}
      {/* <div className="md:col-span-2 lg:col-span-4">
        <TransferFlowDiagramChart from={filters.from} to={filters.to} />
      </div> */}

      {/* Bills Analysis - Conditionally rendered */}
      {featureFlags.bills_enabled && (
        <>
          <div className="md:col-span-2 lg:col-span-4">
            <BillsHistoryChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <BillDebtFlowChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <WalletNetBalanceLineChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <RecurringVsOnetimeBillsChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <BillPaymentTimelineChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <BillPaymentRateChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <BillVelocityGaugeChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <BillCoverageRatioChart />
          </div>

          {/* Bills vs Expenses */}
          <div className="md:col-span-2 lg:col-span-4">
            <BillsVsDiscretionaryChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <BillBurdenRatioChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <ExpensePredictabilityChart from={filters.from} to={filters.to} />
          </div>

          {/* Cash Flow */}
          <div className="md:col-span-2 lg:col-span-4">
            <CashFlowAfterBillsChart from={filters.from} to={filters.to} />
          </div>
        </>
      )}
    </div>
  );
}

export default InfographicsPage;
