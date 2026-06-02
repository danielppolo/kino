"use client";

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
import { CategoryLabelHeatmapChart } from "@/components/charts/category-label-heatmap-chart";
import { CurrencyExposureChart } from "@/components/charts/currency-exposure-chart";
import { ExpenseConcentrationChart } from "@/components/charts/expense-concentration-chart";
import { ExpensePredictabilityChart } from "@/components/charts/expense-predictability-chart";
import { LabelDriftChart } from "@/components/charts/label-drift-chart";
import { LabelTimingHeatmapChart } from "@/components/charts/label-timing-heatmap-chart";
import { LabelVolatilityScatterChart } from "@/components/charts/label-volatility-scatter-chart";
import { RecurringVsOnetimeBillsChart } from "@/components/charts/recurring-vs-onetime-bills-chart";
import { TransactionSizeDistributionChart } from "@/components/charts/transaction-size-distribution-chart";
import { TransactionTypeDistributionChart } from "@/components/charts/transaction-type-distribution-chart";
import { TrendsChart } from "@/components/charts/trends-chart";
import { WalletNetBalanceLineChart } from "@/components/charts/wallet-net-balance-line-chart";
import { useLiveTransactionDateFilters } from "@/hooks/use-live-transaction-date-filters";

interface WalletInfographicsGridProps {
  billsEnabled: boolean;
  walletId: string;
}

export function WalletInfographicsGrid({
  billsEnabled,
  walletId,
}: WalletInfographicsGridProps) {
  const chartFilters = useLiveTransactionDateFilters();

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="md:col-span-2 lg:col-span-3">
        <AccumulatedAreaChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <AvgSpendingVsIncomeChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <TransactionTypeDistributionChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="categories"
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
          type="expense"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="categories"
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
          type="income"
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="labels"
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
          type="expense"
          title="Expense Trends by Label"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <TrendsChart
          variant="labels"
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
          type="income"
          title="Income Trends by Label"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <div className="border-border/70 bg-muted/20 rounded-2xl border border-dashed px-4 py-3">
          <div className="text-foreground text-sm font-semibold tracking-[0.08em]">
            Subjective Insights
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Read labels as intention, not category, to spot drift, volatility,
            timing, and mismatch.
          </p>
        </div>
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <CategoryLabelHeatmapChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <LabelVolatilityScatterChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <LabelTimingHeatmapChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <LabelDriftChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-1">
        <ExpenseConcentrationChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
          topN={5}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <TransactionSizeDistributionChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
          type="expense"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <CurrencyExposureChart
          walletId={walletId}
          from={chartFilters.from}
          to={chartFilters.to}
        />
      </div>

      {billsEnabled && (
        <>
          <div className="md:col-span-2 lg:col-span-3">
            <BillsHistoryChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <BillDebtFlowChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <WalletNetBalanceLineChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <BillBalanceLineChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <RecurringVsOnetimeBillsChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <BillPaymentTimelineChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <BillPaymentRateChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <BillVelocityGaugeChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <BillCoverageRatioChart walletId={walletId} />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <BillsVsDiscretionaryChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <BillBurdenRatioChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <ExpensePredictabilityChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <CashFlowAfterBillsChart
              walletId={walletId}
              from={chartFilters.from}
              to={chartFilters.to}
            />
          </div>
        </>
      )}
    </div>
  );
}
