import { formatCents } from "@/utils/format-cents";
import { TransactionList } from "@/utils/supabase/types";

export function convertTransactionsToCSV(
  transactions: TransactionList[],
): string {
  if (transactions.length === 0) {
    return "";
  }

  // Define CSV headers
  const headers = [
    "Date",
    "Type",
    "Description",
    "Amount",
    "Currency",
    "Category",
    "Label",
    "Tags",
    "Note",
    "Wallet ID",
    "Transfer ID",
  ];

  // Convert transactions to CSV rows
  const rows = transactions.map((transaction) => [
    transaction.date || "",
    transaction.type || "",
    transaction.description || "",
    transaction.amount_cents
      ? formatCents(transaction.amount_cents, transaction.currency || "USD")
      : "",
    transaction.currency || "",
    transaction.category_id || "",
    transaction.label_id || "",
    transaction.tags?.join(", ") || "",
    transaction.note || "",
    transaction.wallet_id || "",
    transaction.transfer_id || "",
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
