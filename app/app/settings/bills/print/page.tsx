import { format } from "date-fns";

import { createClient } from "@/utils/supabase/server";
import { listWallets, listBillsWithPayments } from "@/utils/supabase/queries";
import PrintButton from "./_components/print-button";
import YearSelector from "./_components/year-selector";

export const dynamic = "force-dynamic";

function paymentEmoji(percentage: number): string {
  if (percentage >= 100) return "✅";
  if (percentage > 0) return "🔶";
  return "❌";
}

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function BillsPrintPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("active_workspace_id")
    .maybeSingle();

  const workspaceId = prefs?.active_workspace_id;

  if (!workspaceId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        No se encontró un espacio de trabajo activo.
      </div>
    );
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const { year: yearParam } = await searchParams;
  const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear;

  const from = `${selectedYear}-01-01`;
  // Exclude the current month: for the current year use last day of the
  // previous month; for past years use Dec 31.
  const toDate =
    selectedYear < currentYear
      ? new Date(selectedYear, 11, 31)
      : new Date(currentYear, now.getMonth(), 0); // day 0 = last day of previous month
  const to = format(toDate, "yyyy-MM-dd");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [{ data: wallets }, { data: allBills }] = await Promise.all([
    listWallets(supabase, workspaceId),
    listBillsWithPayments(supabase, { from, to }),
  ]);

  const walletIds = new Set((wallets ?? []).map((w) => w.id));

  const workspaceBills = (allBills ?? []).filter((b) => walletIds.has(b.wallet_id));

  // Group bills that share the same due_date + amount_cents — they represent the
  // same recurring obligation across wallets. Sort groups newest-first, take 12.
  const groupMap = new Map<string, typeof workspaceBills>();
  for (const bill of workspaceBills) {
    const key = `${bill.due_date}__${bill.amount_cents}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(bill);
  }

  const columns = Array.from(groupMap.values())
    .sort((a, b) => b[0].due_date.localeCompare(a[0].due_date))
    .slice(0, 12)
    .reverse();

  const walletsWithBills = new Set(workspaceBills.map((b) => b.wallet_id));
  const workspaceWallets = (wallets ?? [])
    .filter((w) => walletsWithBills.has(w.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const printDate = format(new Date(), "MMMM d, yyyy");

  return (
    <div className="print:p-0 p-6">
      <div className="mb-4 flex items-center justify-between print:mb-2">
        <div>
          <h1 className="text-lg font-semibold">{selectedYear}</h1>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <YearSelector years={years} selected={selectedYear} />
          <PrintButton />
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No se encontraron facturas.</p>
      ) : (
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left font-medium">
                Cuenta
              </th>
              {columns.map((group) => {
                const rep = group[0];
                const key = `${rep.due_date}__${rep.amount_cents}`;
                return (
                  <th
                    key={key}
                    className="border px-1 py-1 text-center font-medium"
                  >
                    <div
                      style={{
                        writingMode: "vertical-lr",
                        textOrientation: "mixed",
                        height: 'auto',
                        padding: '10px',
                      }}
                    >
                      <div style={{ whiteSpace: "nowrap", opacity: 0.6 }}>
                        {rep.due_date.slice(0, 7)}
                      </div>
                      <div style={{ whiteSpace: "nowrap" }}>{rep.description}</div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {workspaceWallets.map((wallet) => (
              <tr key={wallet.id} className="even:bg-muted/30">
                <td className="border px-2 py-1 font-medium">{wallet.name}</td>
                {columns.map((group) => {
                  const rep = group[0];
                  const key = `${rep.due_date}__${rep.amount_cents}`;
                  const match = group.find((b) => b.wallet_id === wallet.id);
                  return match ? (
                    <td key={key} className="border px-1 py-1 text-center">
                      {paymentEmoji(match.payment_percentage)}
                    </td>
                  ) : (
                    <td
                      key={key}
                      className="border px-1 py-1 text-center text-muted-foreground"
                    >
                      –
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground print:mt-2">
        <span>✅ Pagado</span>
        <span>🔶 Parcialmente pagado</span>
        <span>❌ No pagado</span>
        <span>– No aplica</span>
      </div>
    </div>
  );
}
