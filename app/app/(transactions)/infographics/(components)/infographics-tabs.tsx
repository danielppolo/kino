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
import LabelPieChart from "@/components/charts/label-pie-chart";
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

interface InfographicsTabsProps {
  filters: { from?: string; to?: string };
  billsEnabled: boolean;
  autonomyEnabled: boolean;
  fireEnabled: boolean;
  defaultTab: string;
}

export function InfographicsTabs({
  filters,
  billsEnabled,
  autonomyEnabled,
  fireEnabled,
  defaultTab,
}: InfographicsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
                <AutonomyHorizonChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FreedomMultiplierChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <SufficiencyRatioChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <BurnRateDriftChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <ExplorationCapitalChart from={filters.from} to={filters.to} />
              </div>
            </div>
          </TabsContent>
        )}

        {fireEnabled && (
          <TabsContent value="fire">
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-4">
                <FireTargetJustification from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FireTargetProgressChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FireProjectionChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <SavingsRateToFireChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <PortfolioLayerChart />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <FireStressTestChart from={filters.from} to={filters.to} />
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2 lg:col-span-4">
              <ForecastLineChart from={filters.from} to={filters.to} />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <AccumulatedAreaChart from={filters.from} to={filters.to} />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <AvgSpendingVsIncomeChart from={filters.from} to={filters.to} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2 lg:col-span-4">
              <TransactionTypeDistributionChart
                from={filters.from}
                to={filters.to}
              />
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
              <LabelPieChart
                from={filters.from}
                to={filters.to}
                type="expense"
                title="Expenses by Label"
              />
            </div>
            <div className="col-span-2">
              <LabelPieChart
                from={filters.from}
                to={filters.to}
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
              <CurrencyExposureChart from={filters.from} to={filters.to} />
            </div>
          </div>
        </TabsContent>

        {billsEnabled && (
          <TabsContent value="bills">
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-4">
                <BillsHistoryChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <BillDebtFlowChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <WalletNetBalanceLineChart
                  from={filters.from}
                  to={filters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <RecurringVsOnetimeBillsChart
                  from={filters.from}
                  to={filters.to}
                />
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
              <div className="md:col-span-2 lg:col-span-2">
                <BillCoverageRatioChart />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <BillsVsDiscretionaryChart
                  from={filters.from}
                  to={filters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <BillBurdenRatioChart from={filters.from} to={filters.to} />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <ExpensePredictabilityChart
                  from={filters.from}
                  to={filters.to}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <CashFlowAfterBillsChart from={filters.from} to={filters.to} />
              </div>
            </div>
          </TabsContent>
        )}
      </div>
    </Tabs>
  );

  return (
    <ChartControlsProvider from={filters.from} to={filters.to}>
      {content}
    </ChartControlsProvider>
  );
}
