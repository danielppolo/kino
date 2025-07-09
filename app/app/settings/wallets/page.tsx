"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import WalletsSection from "./(components)/wallets-section";

import { exportTransactions } from "@/actions/export-transactions";
import AddWalletButton from "@/components/shared/add-wallet-button";
import { BulkActions } from "@/components/shared/bulk-actions";
import PageHeader from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useWallets } from "@/contexts/settings-context";
import { useSelection } from "@/hooks/use-selection";
import { createClient } from "@/utils/supabase/client";

export default function Page() {
  const [wallets, walletsMap] = useWallets();
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Group wallets by currency
  const walletsByCurrency = useMemo(() => {
    return wallets.reduce(
      (acc, wallet) => {
        if (!acc[wallet.currency]) acc[wallet.currency] = [];
        acc[wallet.currency].push(wallet);
        return acc;
      },
      {} as Record<string, typeof wallets>,
    );
  }, [wallets]);

  const currencies = Object.keys(walletsByCurrency);

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => wallets.map((w) => w.id),
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({
      ids,
      visible,
    }: {
      ids: string[];
      visible: boolean;
    }) => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("wallets")
        .update({ visible })
        .in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });

  const toggleSelect = (wallet: { id: string }) => {
    toggleSelection(wallet.id);
  };

  const handleToggleVisibility = async () => {
    const selectedWallets = selected
      .map((id) => walletsMap.get(id))
      .filter(Boolean) as typeof wallets;
    if (selectedWallets.length === 0) return;
    const allVisible = selectedWallets.every((w) => w.visible);
    try {
      await visibilityMutation.mutateAsync({
        ids: selected,
        visible: !allVisible,
      });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success(
        `${selectedWallets.length} wallet${selectedWallets.length === 1 ? "" : "s"} ${
          allVisible ? "hidden" : "shown"
        }`,
      );
      clearSelection();
    } catch (err) {
      console.error("Error updating wallets:", err);
      toast.error("Error updating wallets");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    for (const id of selected) {
      const wallet = walletsMap.get(id);
      if (!wallet) continue;
      const { error, data } = await exportTransactions({ wallet_id: id });
      if (error) {
        toast.error(`Error exporting ${wallet.name}`);
        continue;
      }
      const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const formattedDate = format(new Date(), "yyyy-MM-dd");
      link.href = url;
      link.setAttribute(
        "download",
        `${wallet.name.toLowerCase()}-transactions-${formattedDate}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    setIsExporting(false);
    clearSelection();
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", value);
    router.push(`/app/settings/wallets?${params.toString()}`);
  };

  const currentCurrency = searchParams.get("currency") || currencies[0] || "";

  return (
    <>
      <Tabs
        onValueChange={handleTabChange}
        defaultValue={currentCurrency}
        value={currentCurrency}
      >
        <PageHeader className="justify-between">
          <TabsList>
            {currencies.map((currency) => (
              <TabsTrigger key={currency} value={currency}>
                {currency}
              </TabsTrigger>
            ))}
          </TabsList>
          <AddWalletButton />
        </PageHeader>

        <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
          {currencies.map((currency) => (
            <TabsContent key={currency} value={currency}>
              <WalletsSection
                selected={selected}
                onToggle={toggleSelect}
                wallets={walletsByCurrency[currency]}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Toggle visibility"
          onClick={handleToggleVisibility}
          disabled={visibilityMutation.isPending}
        >
          {(() => {
            const selectedWallets = selected
              .map((id) => walletsMap.get(id))
              .filter(Boolean) as typeof wallets;
            const allVisible =
              selectedWallets.length > 0 &&
              selectedWallets.every((w) => w.visible);
            return allVisible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            );
          })()}
        </TooltipButton>
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Export transactions"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
