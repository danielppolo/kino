import { format } from "date-fns";

import { WorkspaceFinancialReportToolbar } from "@/components/shared/workspace-financial-report-controls";
import { formatCents } from "@/utils/format-cents";
import { buildWorkspaceFinancialReport } from "@/utils/workspace-financial-report";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

function renderPercent(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)}%`;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const { from, to } = await searchParams;
  const report = await buildWorkspaceFinancialReport({ from, to });
  const { baseCurrency } = report.workspace;

  return (
    <div className="flex h-full flex-col">
        <WorkspaceFinancialReportToolbar
          workspaceId={report.workspace.id}
          workspaceName={report.workspace.name}
          initialFrom={report.period.from ?? undefined}
          initialTo={report.period.to ?? undefined}
        />
      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-6">
        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">Current balances</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCents(report.summary.totalBalanceCents, baseCurrency)}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">Outstanding bills</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCents(report.summary.totalOwedCents, baseCurrency)}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">Net cash flow</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCents(report.summary.totalNetCashflowCents, baseCurrency)}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">Open bills</p>
            <p className="mt-1 text-2xl font-semibold">
              {report.summary.openBillsCount}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <div className="rounded-xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Workspace overview</h3>
                  <p className="text-muted-foreground text-sm">
                    {report.workspace.name} · {report.period.label} · generated{" "}
                    {format(new Date(report.generatedAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                <div className="text-muted-foreground text-sm">
                  Base currency: {baseCurrency}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium">Coverage</h4>
                  <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
                    {report.coverage.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Important limitations</h4>
                  <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
                    {report.coverage.limitations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Wallet summary</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Wallet</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Currency</th>
                      <th className="py-2 pr-3 font-medium text-right">
                        Current balance
                      </th>
                      <th className="py-2 pr-3 font-medium text-right">
                        Balance ({baseCurrency})
                      </th>
                      <th className="py-2 font-medium text-right">Owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.wallets.map((wallet) => (
                      <tr key={wallet.walletId} className="border-b last:border-0">
                        <td className="py-2 pr-3">{wallet.walletName}</td>
                        <td className="py-2 pr-3">{wallet.walletType}</td>
                        <td className="py-2 pr-3">{wallet.currency}</td>
                        <td className="py-2 pr-3 text-right">
                          {formatCents(wallet.currentBalanceCents, wallet.currency)}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {formatCents(wallet.currentBalanceInBaseCents, baseCurrency)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCents(wallet.owedCents, wallet.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Recent activity</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Wallet</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Description</th>
                      <th className="py-2 pr-3 font-medium text-right">
                        Original
                      </th>
                      <th className="py-2 font-medium text-right">
                        Base amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recentTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-muted-foreground py-4 text-center"
                        >
                          No transactions in the selected period.
                        </td>
                      </tr>
                    ) : (
                      report.recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{transaction.date}</td>
                          <td className="py-2 pr-3">{transaction.walletName}</td>
                          <td className="py-2 pr-3 capitalize">
                            {transaction.type}
                          </td>
                          <td className="py-2 pr-3">{transaction.description}</td>
                          <td className="py-2 pr-3 text-right">
                            {formatCents(
                              transaction.amountCents,
                              transaction.currency,
                            )}
                          </td>
                          <td className="py-2 text-right">
                            {formatCents(
                              transaction.amountInBaseCents,
                              baseCurrency,
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Advisor context</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Country</dt>
                  <dd>{report.advisorContext.countryOfResidence ?? "Not provided"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Tax region</dt>
                  <dd>{report.advisorContext.taxRegion ?? "Not provided"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Risk tolerance</dt>
                  <dd>{report.advisorContext.riskTolerance ?? "Not provided"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Liquidity needs</dt>
                  <dd>{report.advisorContext.liquidityNeeds ?? "Not provided"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Time horizon</dt>
                  <dd>{report.advisorContext.timeHorizon ?? "Not provided"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Goals</dt>
                  <dd className="text-right">
                    {report.advisorContext.investmentGoals.join(", ") ||
                      "Not provided"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Constraints</dt>
                  <dd className="text-right">
                    {report.advisorContext.constraints.join(", ") ||
                      "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Debt and bills</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Total billed</dt>
                  <dd>
                    {formatCents(report.summary.totalBillsOwedCents, baseCurrency)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd>
                    {formatCents(report.summary.totalBillsPaidCents, baseCurrency)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Remaining</dt>
                  <dd>
                    {formatCents(
                      report.summary.totalBillsRemainingCents,
                      baseCurrency,
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Latest bill burden</dt>
                  <dd>{renderPercent(report.summary.latestBillBurdenPercent)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Top spending insights</h3>
              <div className="mt-4 space-y-4">
                {report.expenseCategories.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No expense categories available for this period.
                  </p>
                ) : (
                  report.expenseCategories.map((category) => (
                    <div key={category.categoryName}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span>{category.categoryName}</span>
                        <span className="text-muted-foreground">
                          {formatCents(category.totalCents, baseCurrency)} ·{" "}
                          {category.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-muted h-2 rounded-full">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, category.percentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Notable signals</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {report.notableSignals.length === 0 ? (
                  <li className="text-muted-foreground">
                    No material signals detected from the selected data.
                  </li>
                ) : (
                  report.notableSignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
