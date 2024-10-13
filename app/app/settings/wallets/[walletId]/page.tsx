"use client";

import CsvTransactionUploader from "./(components)/import-transactions";

import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

export default function Page({ params }: { params: { walletId: string } }) {
  const [, walletsMap] = useWallets();
  const wallet = walletsMap.get(params.walletId);

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
      <h2>Import</h2>
      <CsvTransactionUploader walletId={params.walletId} />
    </div>
  );
}
