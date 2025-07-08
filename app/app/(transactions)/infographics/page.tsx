import React from "react";

import { AccumulatedAreaChart } from "@/components/charts/accumulated-area-chart";
import { CashflowAreaChart } from "@/components/charts/cashflow-area-chart";
import LabelAreaChart from "@/components/charts/label-area-chart";
import LabelPieChart from "@/components/charts/label-pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filters } from "@/utils/supabase/queries";

interface PageParams {
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ searchParams }: PageParams) {
  const filters = await searchParams;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="md:col-span-2 lg:col-span-4">
        <AccumulatedAreaChart from={filters.from} to={filters.to} />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <CashflowAreaChart from={filters.from} to={filters.to} />
      </div>
      {/* Label Area Chart - Full Width */}
      <div className="md:col-span-2 lg:col-span-4">
        <LabelAreaChart
          from={filters.from}
          to={filters.to}
          type="expense"
          title="Expense Trends by Label"
        />
      </div>
      {/* Label Area Chart - Full Width */}
      <div className="md:col-span-2 lg:col-span-4">
        <LabelAreaChart
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
    </div>
  );
}

export default InfographicsPage;
