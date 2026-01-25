import React from "react";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { BillBalanceLineChart } from "@/components/charts/bill-balance-line-chart";
import { BillsHistoryChart } from "@/components/charts/bills-history-chart";
import { CashflowAreaChart } from "@/components/charts/cashflow-area-chart";
import LabelAreaChart from "@/components/charts/label-area-chart";
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
      {/* Area Charts - Full Width */}
      <div className="md:col-span-2 lg:col-span-3">
        <AccumulatedAreaChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>
      <div className="md:col-span-2 lg:col-span-3">
        <CashflowAreaChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>

      {/* Bills History Chart - Full Width */}
      <div className="md:col-span-2 lg:col-span-3">
        <BillsHistoryChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>

      {/* Bill Balance Line Chart - Full Width */}
      <div className="md:col-span-2 lg:col-span-3">
        <BillBalanceLineChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
        />
      </div>

      {/* Label Area Chart - Full Width */}
      <div className="md:col-span-2 lg:col-span-3">
        <LabelAreaChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="expense"
          title="Expense Trends by Label"
        />
      </div>
      {/* Label Area Chart - Full Width */}
      <div className="md:col-span-2 lg:col-span-3">
        <LabelAreaChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="income"
          title="Income Trends by Label"
        />
      </div>

      {/* Pie Charts - Side by Side */}
      {/* <div className="md:col-span-1 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart
              walletId={walletId}
              from={filters.from}
              to={filters.to}
              type="expense"
              title="Expenses by Category"
            />
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Label Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <LabelPieChart
              walletId={walletId}
              from={filters.from}
              to={filters.to}
              type="expense"
              title="Expenses by Label"
            />
          </CardContent>
        </Card> 
      </div>*/}

      {/* Income Pie Charts - Full Width */}
      {/* <div className="md:col-span-2 lg:col-span-3">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Income by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryPieChart
                walletId={walletId}
                from={filters.from}
                to={filters.to}
                type="income"
                title="Income by Category"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Income by Label</CardTitle>
            </CardHeader>
            <CardContent>
              <LabelPieChart
                walletId={walletId}
                from={filters.from}
                to={filters.to}
                type="income"
                title="Income by Label"
              />
            </CardContent>
          </Card>
        </div>
      </div> */}

      {/* Income Label Area Chart - Full Width */}
      {/* <div className="md:col-span-2 lg:col-span-3">
        <LabelAreaChart
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          type="income"
          title="Income Trends by Label"
        />
      </div> */}
    </div>
  );
}

export default InfographicsPage;
