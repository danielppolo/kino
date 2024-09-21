"use client";

import React, { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsProps {
  // Define your props here
}

const Stats: React.FC<StatsProps> = (props) => {
  const [stats, setStats] = useState({ total: 0, in: 0, out: 0 });

  const calculateStats = (data) => {
    const stats = data.reduce(
      (acc, transaction) => {
        acc.total += transaction.amount_cents;
        if (transaction.amount_cents > 0) {
          acc.in += transaction.amount_cents;
        } else {
          acc.out += Math.abs(transaction.amount_cents);
        }
        return acc;
      },
      { total: 0, in: 0, out: 0 },
    );

    setStats(stats);
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Money In</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.in.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Money Out</p>
                <p className="text-xl font-bold text-red-600">
                  {stats.out.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {/* <BarChart
              data={[
                { name: 'Jan', total: 1000 },
                { name: 'Feb', total: 1200 },
                { name: 'Mar', total: 900 },
                { name: 'Apr', total: 1100 },
                { name: 'May', total: 1500 },
              ]}
            /> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {/* <LineChart
              data={[
                { name: 'Jan', income: 2000, expenses: 1000 },
                { name: 'Feb', income: 2200, expenses: 1200 },
                { name: 'Mar', income: 1900, expenses: 900 },
                { name: 'Apr', income: 2100, expenses: 1100 },
                { name: 'May', income: 2500, expenses: 1500 },
              ]}
            /> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;
