"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { exportTransactions } from "@/actions/export-transactions";
import { SubmitButton } from "@/components/submit-button";
import { Switch } from "@/components/ui/switch";
import { Subtitle, Title } from "@/components/ui/typography";
import UNAMDonation from "@/components/UNAMDonation";
import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";
import { createClient } from "@/utils/supabase/client";

export default function Page() {
  const params = useParams();
  const [, walletsMap] = useWallets();
  const wallet = walletsMap.get(params.walletId as string);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const visibilityMutation = useMutation({
    mutationFn: async ({
      walletId,
      visible,
    }: {
      walletId: string;
      visible: boolean;
    }) => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("wallets")
        .update({ visible })
        .eq("id", walletId);

      if (error) throw new Error(error.message);
      return { error: null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });

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

  const handleVisibilityToggle = async (checked: boolean) => {
    if (!wallet) return;

    try {
      await visibilityMutation.mutateAsync({
        walletId: wallet.id,
        visible: checked,
      });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success(`Wallet ${checked ? "shown" : "hidden"} successfully`);
    } catch {
      toast.error("Error updating wallet visibility");
    }
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
        <Subtitle>Visibility</Subtitle>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-sm">
            Show in wallet overview
          </p>
          <Switch
            checked={wallet?.visible ?? true}
            onCheckedChange={handleVisibilityToggle}
            disabled={visibilityMutation.isPending}
          />
        </div>
        <Subtitle>Export</Subtitle>
        <form action={handleExport} ref={formRef}>
          <SubmitButton>Export</SubmitButton>
        </form>
        <Subtitle>Import</Subtitle>
      </div>
    </div>
  );
}
