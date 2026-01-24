"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import WalletsSection from "./(components)/wallets-section";

import { exportTransactions } from "@/actions/export-transactions";
import AddWalletButton from "@/components/shared/add-wallet-button";
import { BulkActions } from "@/components/shared/bulk-actions";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useWallets } from "@/contexts/settings-context";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { createClient } from "@/utils/supabase/client";

export default function Page() {
  const [wallets, walletsMap] = useWallets();
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

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

  const toggleSelect = (wallet: { id: string }, shiftKey = false) => {
    toggleSelection(wallet.id, shiftKey);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedCount === 0) return;

      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
        if (!visibilityMutation.isPending) {
          handleToggleVisibility();
        }
      }

      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (!isExporting) {
          handleExport();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleExport,
    handleToggleVisibility,
    isExporting,
    selectedCount,
    visibilityMutation.isPending,
  ]);

  return (
    <>
      <PageHeader className="justify-end">
        <AddWalletButton />
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <WalletsSection
          selected={selected}
          onToggle={toggleSelect}
          selectAll={selectAll}
        />
      </div>

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Toggle visibility (V)"
          onClick={handleToggleVisibility}
          disabled={visibilityMutation.isPending}
          loading={visibilityMutation.isPending}
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
          tooltip="Export transactions (E)"
          onClick={handleExport}
          disabled={isExporting}
          loading={isExporting}
        >
          <Download className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
