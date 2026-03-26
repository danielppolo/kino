import { createClient } from "@/utils/supabase/server";
import { listWallets, listBillsWithPayments } from "@/utils/supabase/queries";
import { BillWithPayments } from "@/utils/supabase/types";
import PrintButton from "./_components/print-button";
import YearSelector from "./_components/year-selector";
import ColumnSelector from "./_components/column-selector";

export const dynamic = "force-dynamic";

function paymentEmoji(percentage: number): string {
  if (percentage >= 100) return "✅";
  if (percentage > 0) return "🔶";
  return "❌";
}

interface PageProps {
  searchParams: Promise<{ year?: string; cols?: string }>;
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

  const { year: yearParam, cols: colsParam } = await searchParams;

  const { data: wallets } = await listWallets(supabase, workspaceId);
  const walletIds = new Set((wallets ?? []).map((w) => w.id));
  const walletIdList = Array.from(walletIds);

  // Lightweight query for the dropdown — no payments needed
  const { data: allBillRows } = await supabase
    .from("bills")
    .select("id, wallet_id, description, due_date, amount_cents")
    .in("wallet_id", walletIdList)
    .order("due_date", { ascending: false });

  // Group by (due_date, amount_cents) for the dropdown, sorted desc
  const dropdownGroupMap = new Map<
    string,
    { due_date: string; amount_cents: number; description: string }[]
  >();
  for (const bill of allBillRows ?? []) {
    const key = `${bill.due_date}__${bill.amount_cents}`;
    if (!dropdownGroupMap.has(key)) dropdownGroupMap.set(key, []);
    dropdownGroupMap.get(key)!.push(bill);
  }
  const dropdownGroups = Array.from(dropdownGroupMap.values()).map((g) => ({
    key: `${g[0].due_date}__${g[0].amount_cents}`,
    label: `${g[0].description} – ${g[0].due_date.slice(0, 7)}`,
  }));

  // Years derived from actual bills (desc), used for the year shortcut
  const availableYears = Array.from(
    new Set(dropdownGroups.map((g) => parseInt(g.key.slice(0, 4)))),
  ).sort((a, b) => b - a);

  // Priority: manual cols > year shortcut
  const manualKeys = colsParam ? colsParam.split(",").filter(Boolean) : [];
  const yearFilter = yearParam ? parseInt(yearParam, 10) : null;
  const yearDerivedKeys = yearFilter
    ? dropdownGroups
        .filter((g) => g.key.startsWith(`${yearFilter}-`))
        .map((g) => g.key)
    : [];
  const effectiveSelectedKeys =
    manualKeys.length > 0 ? manualKeys : yearDerivedKeys;

  // Fetch payments only for the selected date range
  let columns: BillWithPayments[][] = [];
  if (effectiveSelectedKeys.length > 0) {
    const dates = effectiveSelectedKeys
      .map((k) => k.split("__")[0])
      .filter(Boolean);
    const from = [...dates].sort()[0];
    const to = [...dates].sort().reverse()[0];

    const { data: billsWithPayments } = await listBillsWithPayments(supabase, {
      from,
      to,
    });

    const groupMap = new Map<string, BillWithPayments[]>();
    for (const bill of (billsWithPayments ?? []).filter((b) =>
      walletIds.has(b.wallet_id),
    )) {
      const key = `${bill.due_date}__${bill.amount_cents}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(bill);
    }

    columns = effectiveSelectedKeys
      .map((k) => groupMap.get(k))
      .filter((g): g is BillWithPayments[] => g !== undefined)
      .sort((a, b) => a[0].due_date.localeCompare(b[0].due_date));
  }

  const walletsInColumns = new Set(
    columns.flatMap((g) => g.map((b) => b.wallet_id)),
  );
  const workspaceWallets = (wallets ?? [])
    .filter((w) => walletsInColumns.has(w.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="print:p-0 p-6">
      <div className="mb-4 flex items-center justify-between print:mb-2">
        <h1 className="text-lg font-semibold print:block">
          {yearFilter ?? ""}
        </h1>
        <div className="flex items-center gap-2 print:hidden">
          <YearSelector years={availableYears} selected={yearFilter} />
          <ColumnSelector
            groups={dropdownGroups}
            selected={effectiveSelectedKeys}
          />
          <PrintButton />
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm text-muted-foreground print:hidden">
          Selecciona un año o las columnas para visualizar.
        </p>
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
                        height: "auto",
                        padding: "10px",
                      }}
                    >
                      <div style={{ whiteSpace: "nowrap", opacity: 0.6 }}>
                        {rep.due_date.slice(0, 7)}
                      </div>
                      <div style={{ whiteSpace: "nowrap" }}>
                        {rep.description}
                      </div>
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

      {columns.length > 0 && (
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground print:mt-2">
          <span>✅ Pagado</span>
          <span>🔶 Parcialmente pagado</span>
          <span>❌ No pagado</span>
          <span>– No aplica</span>
        </div>
      )}
    </div>
  );
}
