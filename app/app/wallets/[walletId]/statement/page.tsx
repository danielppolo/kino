import { format } from "date-fns";

import DateRangeForm from "./_components/date-range-form";
import PrintButton from "./_components/print-button";

import { formatCents } from "@/utils/format-cents";
import { calculateSimpleMonthlyInterestCents } from "@/utils/simple-monthly-interest";
import {
  getWalletOwed,
  listBillsWithPayments,
  listTransactions,
  listWallets,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ walletId: string }>;
  searchParams: Promise<{
    annualInterest?: string;
    from?: string;
    to?: string;
    type?: string;
  }>;
}

function billStatus(percentage: number): string {
  if (percentage >= 100) return "Paid";
  if (percentage > 0) return "Partial";
  return "Unpaid";
}

export default async function WalletStatementPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = await createClient();
  const { walletId } = await params;
  const {
    annualInterest: annualInterestParam,
    from: fromParam,
    to: toParam,
    type: typeParam,
  } = await searchParams;
  const parsedAnnualInterest = Number(annualInterestParam ?? "9");
  const annualInterest =
    Number.isFinite(parsedAnnualInterest) &&
    parsedAnnualInterest >= 0 &&
    parsedAnnualInterest <= 100
      ? parsedAnnualInterest
      : 9;
  const statementType = (
    typeParam === "transactions" || typeParam === "bills" ? typeParam : "all"
  ) as "all" | "transactions" | "bills";

  // Default: current year
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-01-01`;
  const defaultTo = format(now, "yyyy-MM-dd");
  const from = fromParam ?? defaultFrom;
  const to = toParam ?? defaultTo;

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("active_workspace_id")
    .maybeSingle();

  const workspaceId = prefs?.active_workspace_id;

  if (!workspaceId) {
    return (
      <div className="text-muted-foreground p-8 text-sm">
        No active workspace found.
      </div>
    );
  }

  const { data: workspaceRow } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  const { data: wallets } = await listWallets(supabase, workspaceId);
  const wallet = (wallets ?? []).find((w) => w.id === walletId);

  if (!wallet) {
    return (
      <div className="text-muted-foreground p-8 text-sm">Wallet not found.</div>
    );
  }

  const { data: transactions } = await listTransactions(supabase, {
    wallet_id: walletId,
    from,
    to,
    sort: "date",
    sortOrder: "asc",
    pageSize: 5000,
  });

  const { data: bills } = await listBillsWithPayments(supabase, {
    walletId,
    from,
    to,
  });

  const { data: owedCents } = await getWalletOwed(supabase, walletId);

  const txRows = transactions ?? [];
  const billRows = (bills ?? [])
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const billsWithInterest = billRows.map((bill) => {
    const interestCents = calculateSimpleMonthlyInterestCents({
      annualRatePercent: annualInterest,
      asOfDate: to,
      dueDate: bill.due_date,
      payments: bill.payments.map(({ transaction }) => ({
        amountCents: transaction.amount_cents,
        date: transaction.date,
      })),
      principalCents: bill.amount_cents,
    });

    return { ...bill, interestCents };
  });

  // Compute transaction totals & running balance
  let runningCents = 0;
  const txWithRunning = txRows.map((tx) => {
    const amt = tx.amount_cents ?? 0;
    const delta = tx.type === "income" ? amt : tx.type === "expense" ? -amt : 0; // transfers: neutral for running total
    runningCents += delta;
    return { ...tx, delta, running: runningCents };
  });

  const totalIncomeCents = txRows
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + (t.amount_cents ?? 0), 0);
  const totalExpenseCents = txRows
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + (t.amount_cents ?? 0), 0);
  const netCents = totalIncomeCents - totalExpenseCents;

  const totalBillsOwedCents = billRows.reduce((s, b) => s + b.amount_cents, 0);
  const totalBillsPaidCents = billRows.reduce(
    (s, b) => s + b.paid_amount_cents,
    0,
  );
  const totalBillsRemainingCents = totalBillsOwedCents - totalBillsPaidCents;
  const totalInterestCents = billsWithInterest.reduce(
    (sum, bill) => sum + bill.interestCents,
    0,
  );

  const workspaceName = workspaceRow?.name ?? "Workspace";
  const generatedOn = format(now, "PPP");
  const periodLabel = `${from} – ${to}`;

  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 15mm; }`}</style>
      <div className="mx-auto max-w-[210mm] p-8 font-sans text-sm print:max-w-none print:p-0">
        {/* Controls — hidden on print */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <span className="text-muted-foreground text-xs">
            Account Statement
          </span>
          <div className="flex items-center gap-3">
            <DateRangeForm
              annualInterest={annualInterest}
              walletId={walletId}
              from={from}
              to={to}
              statementType={statementType}
            />
            <PrintButton />
          </div>
        </div>

        {/* Header */}
        <div className="mb-6 border-b-2 border-black pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {workspaceName}
              </p>
              <p className="mt-0.5 text-base font-semibold text-gray-600">
                Account Statement
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p className="font-medium text-gray-800">Date: {generatedOn}</p>
              <p>Period: {periodLabel}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div>
              <span className="text-xs tracking-wide text-gray-500 uppercase">
                Wallet
              </span>
              <p className="text-lg font-bold">{wallet.name}</p>
            </div>
            <div className="ml-8">
              <span className="text-xs tracking-wide text-gray-500 uppercase">
                Owed Balance
              </span>
              <p className="text-lg font-bold text-red-700">
                {formatCents(owedCents ?? 0, wallet.currency)}
              </p>
            </div>
            <div>
              <span className="text-xs tracking-wide text-gray-500 uppercase">
                Currency
              </span>
              <p className="text-lg font-bold">{wallet.currency}</p>
            </div>
          </div>
        </div>

        {/* Section 1 — Transactions */}
        {(statementType === "all" || statementType === "transactions") && (
          <div className="mb-6">
            <h2 className="mb-2 border-b pb-1 text-xs font-bold tracking-widest text-gray-700 uppercase">
              Transactions
            </h2>
            {txWithRunning.length === 0 ? (
              <p className="py-2 text-xs text-gray-400">
                No transactions in this period.
              </p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="py-1.5 pr-3 font-semibold">Date</th>
                    <th className="py-1.5 pr-3 font-semibold">Concept</th>
                    <th className="py-1.5 pr-3 font-semibold">Type</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">
                      Debit
                    </th>
                    <th className="py-1.5 pr-3 text-right font-semibold">
                      Credit
                    </th>
                    <th className="py-1.5 text-right font-semibold">
                      Running Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {txWithRunning.map((tx) => (
                    <tr
                      key={tx.id ?? ""}
                      className="border-b border-gray-100 even:bg-gray-50"
                    >
                      <td className="py-1 pr-3 tabular-nums">
                        {tx.date ?? "—"}
                      </td>
                      <td className="py-1 pr-3">{tx.description ?? "—"}</td>
                      <td className="py-1 pr-3 text-gray-500 capitalize">
                        {tx.type ?? "—"}
                      </td>
                      <td className="py-1 pr-3 text-right text-red-700 tabular-nums">
                        {tx.type === "expense" ? (
                          (tx.amount_cents ?? 0) === 0 ? (
                            <span className="text-black">—</span>
                          ) : (
                            formatCents(
                              tx.amount_cents ?? 0,
                              tx.currency ?? wallet.currency,
                            )
                          )
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="py-1 pr-3 text-right text-green-700 tabular-nums">
                        {tx.type === "income" ? (
                          (tx.amount_cents ?? 0) === 0 ? (
                            <span className="text-black">—</span>
                          ) : (
                            formatCents(
                              tx.amount_cents ?? 0,
                              tx.currency ?? wallet.currency,
                            )
                          )
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {tx.type === "transfer" ? (
                          "—"
                        ) : tx.running === 0 ? (
                          <span className="text-black">—</span>
                        ) : (
                          formatCents(tx.running, wallet.currency)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Section 2 — Bills */}
        {(statementType === "all" || statementType === "bills") && (
          <div className="mb-6">
            <h2 className="mb-2 border-b pb-1 text-xs font-bold tracking-widest text-gray-700 uppercase">
              Bills
            </h2>
            <p className="mb-2 text-[11px] text-gray-500">
              Simple monthly interest preview at {annualInterest.toFixed(2)}%
              annual, calculated through {to}. Interest is not saved.
            </p>
            {billRows.length === 0 ? (
              <p className="py-2 text-xs text-gray-400">
                No bills in this period.
              </p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="py-1.5 pr-3 font-semibold">Due Date</th>
                    <th className="py-1.5 pr-3 font-semibold">Description</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">
                      Owed
                    </th>
                    <th className="py-1.5 pr-3 text-right font-semibold">
                      Paid
                    </th>
                    <th className="py-1.5 pr-3 text-right font-semibold">
                      Remaining
                    </th>
                    <th className="py-1.5 pr-3 text-right font-semibold">
                      Interest
                    </th>
                    <th className="py-1.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billsWithInterest.map((bill) => {
                    const remaining =
                      bill.amount_cents - bill.paid_amount_cents;
                    const status = billStatus(bill.payment_percentage);
                    return (
                      <tr
                        key={bill.id}
                        className="border-b border-gray-100 even:bg-gray-50"
                      >
                        <td className="py-1 pr-3 tabular-nums">
                          {bill.due_date}
                        </td>
                        <td className="py-1 pr-3">{bill.description}</td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {bill.amount_cents === 0
                            ? "—"
                            : formatCents(bill.amount_cents, bill.currency)}
                        </td>
                        <td className="py-1 pr-3 text-right text-green-700 tabular-nums">
                          {bill.paid_amount_cents === 0 ? (
                            <span className="text-black">—</span>
                          ) : (
                            formatCents(bill.paid_amount_cents, bill.currency)
                          )}
                        </td>
                        <td className="py-1 pr-3 text-right text-red-700 tabular-nums">
                          {remaining === 0 ? (
                            <span className="text-black">—</span>
                          ) : (
                            formatCents(remaining, bill.currency)
                          )}
                        </td>
                        <td className="py-1 pr-3 text-right text-amber-700 tabular-nums">
                          {bill.interestCents === 0 ? (
                            <span className="text-black">—</span>
                          ) : (
                            formatCents(bill.interestCents, bill.currency)
                          )}
                        </td>
                        <td
                          className={`py-1 text-right font-medium ${
                            status === "Paid"
                              ? "text-green-700"
                              : status === "Partial"
                                ? "text-amber-600"
                                : "text-red-700"
                          }`}
                        >
                          {status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Section 3 — Summary */}
        <div className="mb-6">
          <h2 className="mb-2 border-b pb-1 text-xs font-bold tracking-widest text-gray-700 uppercase">
            Summary
          </h2>
          <div className="grid grid-cols-2 gap-x-8 text-xs">
            {statementType !== "bills" && (
              <div className="space-y-1">
                <div className="flex justify-between border-b border-gray-100 py-1">
                  <span className="text-gray-600">Total Credits (Income)</span>
                  <span className="font-medium text-green-700 tabular-nums">
                    {formatCents(totalIncomeCents, wallet.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-100 py-1">
                  <span className="text-gray-600">Total Debits (Expenses)</span>
                  <span className="font-medium text-red-700 tabular-nums">
                    {formatCents(totalExpenseCents, wallet.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1 font-bold">
                  <span>Net (Credits − Debits)</span>
                  <span
                    className={`tabular-nums ${netCents >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {formatCents(netCents, wallet.currency)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex justify-between border-b border-gray-100 py-1">
                <span className="text-gray-600">Total Bills Owed</span>
                <span className="font-medium tabular-nums">
                  {formatCents(totalBillsOwedCents, wallet.currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1">
                <span className="text-gray-600">Total Bills Paid</span>
                <span className="font-medium text-green-700 tabular-nums">
                  {formatCents(totalBillsPaidCents, wallet.currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1 font-bold">
                <span>Total Remaining Principal</span>
                <span
                  className={`tabular-nums ${totalBillsRemainingCents > 0 ? "text-red-700" : "text-green-700"}`}
                >
                  {formatCents(totalBillsRemainingCents, wallet.currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1">
                <span className="text-gray-600">Total Interest Preview</span>
                <span className="font-medium text-amber-700 tabular-nums">
                  {formatCents(totalInterestCents, wallet.currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1 font-bold">
                <span>Total Remaining incl. Interest</span>
                <span className="text-red-700 tabular-nums">
                  {formatCents(
                    totalBillsRemainingCents + totalInterestCents,
                    wallet.currency,
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 font-bold">
                <span>Current Owed Balance</span>
                <span className="text-red-700 tabular-nums">
                  {formatCents(owedCents ?? 0, wallet.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t pt-3 text-xs text-gray-400">
          <p>
            Generated on {generatedOn} · {workspaceName} · {wallet.name}
          </p>
        </div>
      </div>
    </>
  );
}
