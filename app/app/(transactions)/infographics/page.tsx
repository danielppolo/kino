import React from "react";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { AutonomyHorizonChart } from "@/components/charts/autonomy-horizon-chart";
import { BurnRateDriftChart } from "@/components/charts/burn-rate-drift-chart";
import { ExplorationCapitalChart } from "@/components/charts/exploration-capital-chart";
import { FreedomMultiplierChart } from "@/components/charts/freedom-multiplier-chart";
import { SufficiencyRatioChart } from "@/components/charts/sufficiency-ratio-chart";
import {
  parseFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
} from "@/utils/types/feature-flags";
import { createClient } from "@/utils/supabase/server";
import { AvgSpendingVsIncomeChart } from "@/components/charts/avg-spending-vs-income-chart";
import { CurrencyExposureChart } from "@/components/charts/currency-exposure-chart";
import { ExpenseConcentrationChart } from "@/components/charts/expense-concentration-chart";
import { ForecastLineChart } from "@/components/charts/forecast-line-chart";
import LabelPieChart from "@/components/charts/label-pie-chart";
import { TrendsChart } from "@/components/charts/trends-chart";
import { TagCloudAnalyticsChart } from "@/components/charts/tag-cloud-analytics-chart";
import { TransactionSizeDistributionChart } from "@/components/charts/transaction-size-distribution-chart";
import { TransactionTypeDistributionChart } from "@/components/charts/transaction-type-distribution-chart";
import { Filters } from "@/utils/supabase/queries";

interface PageParams {
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ searchParams }: PageParams) {
  const filters = await searchParams;

  // Fetch feature flags from the active workspace
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = user
    ? await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(feature_flags)")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  type WorkspaceWithFlags = { feature_flags?: unknown };
  const workspace = member?.workspaces as WorkspaceWithFlags | null;
  const featureFlags = workspace?.feature_flags
    ? parseFeatureFlags(workspace.feature_flags)
    : DEFAULT_FEATURE_FLAGS;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Autonomy Framework */}
      {featureFlags.infographics_autonomy_enabled && (
        <>
          <div className="md:col-span-2 lg:col-span-4">
            <AutonomyHorizonChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <FreedomMultiplierChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <SufficiencyRatioChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <BurnRateDriftChart from={filters.from} to={filters.to} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <ExplorationCapitalChart from={filters.from} to={filters.to} />
          </div>
        </>
      )}

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
    </div>
  );
}

export default InfographicsPage;
