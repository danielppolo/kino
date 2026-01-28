import React from "react";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { AvgSpendingVsIncomeChart } from "@/components/charts/avg-spending-vs-income-chart";
import { BillBalanceLineChart } from "@/components/charts/bill-balance-line-chart";
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
import { RecurringVsOnetimeBillsChart } from "@/components/charts/recurring-vs-onetime-bills-chart";
import { TrendsChart } from "@/components/charts/trends-chart";
import { TagCloudAnalyticsChart } from "@/components/charts/tag-cloud-analytics-chart";
import { TransactionSizeDistributionChart } from "@/components/charts/transaction-size-distribution-chart";
import { TransactionTypeDistributionChart } from "@/components/charts/transaction-type-distribution-chart";
import { WalletNetBalanceLineChart } from "@/components/charts/wallet-net-balance-line-chart";
import { Filters } from "@/utils/supabase/queries";

interface PageParams {
  params: { walletId: string };
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ params, searchParams }: PageParams) {
  const { walletId } = await params;
  const filters = await searchParams;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Overview */}
      <div className="md:col-span-2 lg:col-span-3">
        <AccumulatedAreaChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <AvgSpendingVsIncomeChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>

      {/* Transaction Analysis */}
      <div className="md:col-span-2 lg:col-span-3">
        <TransactionTypeDistributionChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="categories"
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="expense"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="categories"
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="income"
        />
      </div>

      {/* Label Analysis */}
      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="labels"
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="expense"
          title="Expense Trends by Label"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="labels"
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="income"
          title="Income Trends by Label"
        />
      </div>

      {/* Expense Analysis */}
      <div className="md:col-span-2 lg:col-span-1">
        <ExpenseConcentrationChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          topN={5}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <TransactionSizeDistributionChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="expense"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <CurrencyExposureChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <TagCloudAnalyticsChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>

      {/* Transfer Analysis */}
      {/* <div className="md:col-span-2 lg:col-span-3">
        <TransferFlowDiagramChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div> */}

      {/* Bills Analysis */}
      <div className="md:col-span-2 lg:col-span-3">
        <BillsHistoryChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <BillDebtFlowChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <WalletNetBalanceLineChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <BillBalanceLineChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <RecurringVsOnetimeBillsChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <BillPaymentTimelineChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <BillPaymentRateChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <BillVelocityGaugeChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <BillCoverageRatioChart walletId={walletId} />
      </div>

      {/* Bills vs Expenses */}
      <div className="md:col-span-2 lg:col-span-3">
        <BillsVsDiscretionaryChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <BillBurdenRatioChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <ExpensePredictabilityChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>

      {/* Cash Flow */}
      <div className="md:col-span-2 lg:col-span-3">
        <CashFlowAfterBillsChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
    </div>
  );
}

export default InfographicsPage;
