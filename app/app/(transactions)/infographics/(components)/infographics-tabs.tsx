"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { AutonomyHorizonChart } from "@/components/charts/autonomy-horizon-chart";
import { AvgSpendingVsIncomeChart } from "@/components/charts/avg-spending-vs-income-chart";
import { BurnRateDriftChart } from "@/components/charts/burn-rate-drift-chart";
import { CurrencyExposureChart } from "@/components/charts/currency-exposure-chart";
import { ExpenseConcentrationChart } from "@/components/charts/expense-concentration-chart";
import { ExplorationCapitalChart } from "@/components/charts/exploration-capital-chart";
import { ForecastLineChart } from "@/components/charts/forecast-line-chart";
import { FreedomMultiplierChart } from "@/components/charts/freedom-multiplier-chart";
import LabelPieChart from "@/components/charts/label-pie-chart";
import { SufficiencyRatioChart } from "@/components/charts/sufficiency-ratio-chart";
import { TagCloudAnalyticsChart } from "@/components/charts/tag-cloud-analytics-chart";
import { TransactionSizeDistributionChart } from "@/components/charts/transaction-size-distribution-chart";
import { TransactionTypeDistributionChart } from "@/components/charts/transaction-type-distribution-chart";
import { TrendsChart } from "@/components/charts/trends-chart";
import { ChartControlsProvider } from "@/components/charts/shared/chart-controls-context";
import { ChartHeaderControls } from "@/components/charts/shared/chart-header-controls";
import PageHeader from "@/components/shared/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface InfographicsTabsProps {
  filters: { from?: string; to?: string };
  autonomyEnabled: boolean;
  defaultTab: string;
}

export function InfographicsTabs({
  filters,
  autonomyEnabled,
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
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        {autonomyEnabled && activeTab === "autonomy" && <ChartHeaderControls />}
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        {autonomyEnabled && (
          <TabsContent value="autonomy">
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="md:col-span-2 lg:col-span-4">
                  <AutonomyHorizonChart
                    from={filters.from}
                    to={filters.to}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <FreedomMultiplierChart
                    from={filters.from}
                    to={filters.to}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <SufficiencyRatioChart
                    from={filters.from}
                    to={filters.to}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <BurnRateDriftChart from={filters.from} to={filters.to} />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <ExplorationCapitalChart
                    from={filters.from}
                    to={filters.to}
                  />
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
              <AvgSpendingVsIncomeChart
                from={filters.from}
                to={filters.to}
              />
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
          </div>
        </TabsContent>

        <TabsContent value="labels">
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
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
              <TagCloudAnalyticsChart from={filters.from} to={filters.to} />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <CurrencyExposureChart from={filters.from} to={filters.to} />
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );

  return autonomyEnabled ? (
    <ChartControlsProvider from={filters.from} to={filters.to}>
      {content}
    </ChartControlsProvider>
  ) : (
    content
  );
}
