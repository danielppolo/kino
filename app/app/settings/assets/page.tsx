"use client";

import { useEffect } from "react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import AssetsSection from "./(components)/assets-section";

import AddRealEstateAssetButton from "@/components/shared/add-real-estate-asset-button";
import { BulkActions } from "@/components/shared/bulk-actions";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useRealEstateAssets } from "@/contexts/settings-context";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { updateRealEstateAsset } from "@/utils/supabase/mutations";
import { RealEstateAsset } from "@/utils/supabase/types";

export default function AssetsPage() {
  const [assets, assetsMap] = useRealEstateAssets();
  const queryClient = useQueryClient();
  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => assets.map((asset) => asset.id),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: RealEstateAsset["status"];
    }) => {
      await Promise.all(
        ids.map((id) =>
          updateRealEstateAsset({
            id,
            status,
          }),
        ),
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceQueries(queryClient);
      toast.success(
        variables.status === "archived"
          ? "Assets archived"
          : "Assets restored",
      );
      clearSelection();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update assets");
    },
  });

  const toggleSelect = (asset: RealEstateAsset, shiftKey = false) => {
    toggleSelection(asset.id, shiftKey);
  };

  const selectedAssets = selected
    .map((id) => assetsMap.get(id))
    .filter(Boolean) as RealEstateAsset[];
  const allArchived =
    selectedAssets.length > 0 &&
    selectedAssets.every((asset) => asset.status === "archived");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedCount === 0) return;

      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        archiveMutation.mutate({
          ids: selected,
          status: allArchived ? "active" : "archived",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allArchived, archiveMutation, selected, selectedCount]);

  return (
    <>
      <PageHeader className="justify-end">
        <AddRealEstateAssetButton />
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <AssetsSection
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
          tooltip={allArchived ? "Restore (A)" : "Archive (A)"}
          onClick={() =>
            archiveMutation.mutate({
              ids: selected,
              status: allArchived ? "active" : "archived",
            })
          }
          disabled={archiveMutation.isPending}
          loading={archiveMutation.isPending}
        >
          <ArchiveRestore className="size-4" />
        </TooltipButton>
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Archive assets via the drawer to delete permanently"
          disabled
        >
          <Trash2 className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
