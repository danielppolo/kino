"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { AutonomyHorizonChart } from "@/components/charts/autonomy-horizon-chart";
import { AvgSpendingVsIncomeChart } from "@/components/charts/avg-spending-vs-income-chart";
import { BillBurdenRatioChart } from "@/components/charts/bill-burden-ratio-chart";
import { BillCoverageRatioChart } from "@/components/charts/bill-coverage-ratio-chart";
import { BillDebtFlowChart } from "@/components/charts/bill-debt-flow-chart";
import { BillPaymentRateChart } from "@/components/charts/bill-payment-rate-chart";
import { BillPaymentTimelineChart } from "@/components/charts/bill-payment-timeline-chart";
import { BillVelocityGaugeChart } from "@/components/charts/bill-velocity-gauge-chart";
import { BillsHistoryChart } from "@/components/charts/bills-history-chart";
import { BillsVsDiscretionaryChart } from "@/components/charts/bills-vs-discretionary-chart";
import { BurnRateDriftChart } from "@/components/charts/burn-rate-drift-chart";
import { CashFlowAfterBillsChart } from "@/components/charts/cash-flow-after-bills-chart";
import { CategoryLabelHeatmapChart } from "@/components/charts/category-label-heatmap-chart";
import { CurrencyExposureChart } from "@/components/charts/currency-exposure-chart";
import { ExpenseConcentrationChart } from "@/components/charts/expense-concentration-chart";
import { ExpensePredictabilityChart } from "@/components/charts/expense-predictability-chart";
import { ExplorationCapitalChart } from "@/components/charts/exploration-capital-chart";
import { FireProjectionChart } from "@/components/charts/fire-projection-chart";
import { FireStressTestChart } from "@/components/charts/fire-stress-test-chart";
import { FireTargetJustification } from "@/components/charts/fire-target-justification";
import { FireTargetProgressChart } from "@/components/charts/fire-target-progress-chart";
import { ForecastLineChart } from "@/components/charts/forecast-line-chart";
import { FreedomMultiplierChart } from "@/components/charts/freedom-multiplier-chart";
import { LabelDriftChart } from "@/components/charts/label-drift-chart";
import LabelPieChart from "@/components/charts/label-pie-chart";
import { LabelTimingHeatmapChart } from "@/components/charts/label-timing-heatmap-chart";
import { LabelVolatilityScatterChart } from "@/components/charts/label-volatility-scatter-chart";
import { PortfolioLayerChart } from "@/components/charts/portfolio-layer-chart";
import { RecurringVsOnetimeBillsChart } from "@/components/charts/recurring-vs-onetime-bills-chart";
import { SavingsRateToFireChart } from "@/components/charts/savings-rate-to-fire-chart";
import { ChartControlsProvider } from "@/components/charts/shared/chart-controls-context";
import { ChartHeaderControls } from "@/components/charts/shared/chart-header-controls";
import { SufficiencyRatioChart } from "@/components/charts/sufficiency-ratio-chart";
import { TransactionSizeDistributionChart } from "@/components/charts/transaction-size-distribution-chart";
import { TransactionTypeDistributionChart } from "@/components/charts/transaction-type-distribution-chart";
import { TrendsChart } from "@/components/charts/trends-chart";
import { WalletNetBalanceLineChart } from "@/components/charts/wallet-net-balance-line-chart";
import PageHeader from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveTransactionDateFilters } from "@/hooks/use-live-transaction-date-filters";

interface InfographicsTabsProps {
  billsEnabled: boolean;
  autonomyEnabled: boolean;
  fireEnabled: boolean;
  defaultTab: string;
}

export function InfographicsTabs({
  billsEnabled,
  autonomyEnabled,
  fireEnabled,
  defaultTab,
}: InfographicsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartFilters = useLiveTransactionDateFilters();
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`?${params.toString()}`);
  };

  const content = (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageHeader>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {autonomyEnabled && (
            <TabsTrigger value="autonomy">Autonomy</TabsTrigger>
          )}
          {fireEnabled && <TabsTrigger value="fire">FIRE</TabsTrigger>}
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          {billsEnabled && <TabsTrigger value="bills">Bills</TabsTrigger>}
        </TabsList>
        <ChartHeaderControls
          showAutonomyControls={autonomyEnabled}
          showFireControls={fireEnabled}
        />
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        {autonomyEnabled && (
          <TabsContent value="autonomy">
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-4">
                <AutonomyHorizonChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FreedomMultiplierChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <SufficiencyRatioChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <BurnRateDriftChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <ExplorationCapitalChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
            </div>
          </TabsContent>
        )}

        {fireEnabled && (
          <TabsContent value="fire">
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-4">
                <FireTargetJustification
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FireTargetProgressChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FireProjectionChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <SavingsRateToFireChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <PortfolioLayerChart />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FireStressTestChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2 lg:col-span-4">
              <ForecastLineChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <AccumulatedAreaChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <AvgSpendingVsIncomeChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2 lg:col-span-4">
              <TransactionTypeDistributionChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <TrendsChart
                variant="categories"
                from={chartFilters.from}
                to={chartFilters.to}
                type="expense"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <TrendsChart
                variant="categories"
                from={chartFilters.from}
                to={chartFilters.to}
                type="income"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <TrendsChart
                variant="labels"
                from={chartFilters.from}
                to={chartFilters.to}
                type="expense"
                title="Expense Trends by Label"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <TrendsChart
                variant="labels"
                from={chartFilters.from}
                to={chartFilters.to}
                type="income"
                title="Income Trends by Label"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <div className="border-border/70 bg-muted/20 rounded-2xl border border-dashed px-4 py-3">
                <div className="text-foreground text-sm font-semibold tracking-[0.08em]">
                  Subjective Insights
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  Read labels as intention, not category, to spot drift,
                  volatility, timing, and mismatch.
                </p>
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <CategoryLabelHeatmapChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <LabelVolatilityScatterChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <LabelTimingHeatmapChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <LabelDriftChart from={chartFilters.from} to={chartFilters.to} />
            </div>
            <div className="col-span-2">
              <LabelPieChart
                from={chartFilters.from}
                to={chartFilters.to}
                type="expense"
                title="Expenses by Label"
              />
            </div>
            <div className="col-span-2">
              <LabelPieChart
                from={chartFilters.from}
                to={chartFilters.to}
                type="income"
                title="Income by Label"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2 lg:col-span-2">
              <ExpenseConcentrationChart
                from={chartFilters.from}
                to={chartFilters.to}
                topN={5}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <TransactionSizeDistributionChart
                from={chartFilters.from}
                to={chartFilters.to}
                type="expense"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <CurrencyExposureChart
                from={chartFilters.from}
                to={chartFilters.to}
              />
            </div>
          </div>
        </TabsContent>

        {billsEnabled && (
          <TabsContent value="bills">
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-4">
                <BillsHistoryChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <BillDebtFlowChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <WalletNetBalanceLineChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <RecurringVsOnetimeBillsChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <BillPaymentTimelineChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <BillPaymentRateChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <BillVelocityGaugeChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <BillCoverageRatioChart />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <BillsVsDiscretionaryChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <BillBurdenRatioChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <ExpensePredictabilityChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <CashFlowAfterBillsChart
                  from={chartFilters.from}
                  to={chartFilters.to}
                />
              </div>
            </div>
          </TabsContent>
        )}
      </div>
    </Tabs>
  );

  return (
    <ChartControlsProvider from={chartFilters.from} to={chartFilters.to}>
      {content}
    </ChartControlsProvider>
  );
}
