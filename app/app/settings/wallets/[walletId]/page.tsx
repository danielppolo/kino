"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import CsvTransactionUploader from "./(components)/import-transactions";

import { exportTransactions } from "@/actions/export-transactions";
import { SubmitButton } from "@/components/submit-button";
import { Subtitle, Title } from "@/components/ui/typography";
import UNAMDonation from "@/components/UNAMDonation";
import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

export default function Page() {
  const params = useParams();
  const [, walletsMap] = useWallets();
  const wallet = walletsMap.get(params.walletId as string);
  const formRef = useRef<HTMLFormElement>(null);

  const handleExport = async () => {
    const { error, data } = await exportTransactions({
      wallet_id: params.walletId as string,
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
    formRef.current?.reset();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex w-full items-center justify-between gap-2">
          <Title>{wallet?.name}</Title>
          {params.walletId === "c357aa5c-ad41-4c41-8d67-bf5516117187" && (
            <UNAMDonation />
          )}
        </div>
        <Subtitle>Currency</Subtitle>
        <p>{wallet?.currency}</p>
        <Subtitle>Balance</Subtitle>
        <p>{formatCents(wallet?.balance_cents ?? 0)}</p>
        <Subtitle>Export</Subtitle>
        <form action={handleExport} ref={formRef}>
          <SubmitButton>Export</SubmitButton>
        </form>
        <Subtitle>Import</Subtitle>
        <CsvTransactionUploader walletId={params.walletId as string} />
      </div>
    </div>
  );
}
