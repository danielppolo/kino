"use client";

import { format } from "date-fns";
import { toast } from "sonner";

import CsvTransactionUploader from "./(components)/import-transactions";

import { exportTransactions } from "@/actions/export-transactions";
import { SubmitButton } from "@/components/submit-button";
import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

export default function Page({ params }: { params: { walletId: string } }) {
  const [, walletsMap] = useWallets();
  const wallet = walletsMap.get(params.walletId);

  const handleExport = async () => {
    const { error, data } = await exportTransactions({
      wallet_id: params.walletId,
    });

    if (error) {
      toast.error("Error exporting transactions");
      return;
    }

    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const formattedDate = format(new Date(), "yyyy-MM-dd");
    link.setAttribute(
      "download",
      `${wallet?.name.toLocaleLowerCase()}-transactions-${formattedDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1>Wallet</h1>
      <h2>Labels</h2>
      <h2>Members</h2>
      <h2>Configuration</h2>
      <ul>
        <li>Visibility</li>
        <li>Currency: {wallet?.currency}</li>
        <li>Balance: {formatCents(wallet?.balance_cents ?? 0)}</li>
      </ul>
      <h2>Export</h2>
      <form action={handleExport}>
        <SubmitButton>Export</SubmitButton>
      </form>
      <h2>Import</h2>
      <CsvTransactionUploader walletId={params.walletId} />
    </div>
  );
}
