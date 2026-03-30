"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/shared/empty-state";
import { RealEstateAssetForm } from "@/components/shared/real-estate-asset-form";
import RealEstateAssetRow from "@/components/shared/real-estate-asset-row";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import { useRealEstateAssets } from "@/contexts/settings-context";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { createClient } from "@/utils/supabase/client";
import { listRealEstateAssetValuations } from "@/utils/supabase/queries";
import {
  RealEstateAsset,
  RealEstateAssetValuation,
} from "@/utils/supabase/types";

interface AssetsSectionProps {
  selected: string[];
  onToggle: (asset: RealEstateAsset, shiftKey: boolean) => void;
  selectAll: () => void;
}

export function AssetsSection({
  selected,
  onToggle,
  selectAll,
}: AssetsSectionProps) {
  const [assets] = useRealEstateAssets();
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<RealEstateAsset | null>(null);

  const { data: valuations = [] } = useQuery<RealEstateAssetValuation[]>({
    queryKey: ["real-estate-asset-valuations", assets.map((asset) => asset.id).join(",")],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listRealEstateAssetValuations(supabase, {
        assetIds: assets.map((asset) => asset.id),
      });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: assets.length > 0,
  });

  const latestValuationMap = new Map<string, RealEstateAssetValuation>();
  valuations.forEach((valuation) => {
    if (!latestValuationMap.has(valuation.asset_id)) {
      latestValuationMap.set(valuation.asset_id, valuation);
    }
  });

  const orderedAssets = [...assets].sort((a, b) => a.name.localeCompare(b.name));

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: orderedAssets,
    getItemId: (asset) => asset.id,
    onEnter: (asset) => {
      setSelectedAsset(asset);
      setOpen(true);
    },
    onSpace: (asset) => onToggle(asset, false),
    onSelectAll: selectAll,
  });

  if (assets.length === 0) {
    return (
      <EmptyState
        title="No assets found"
        description="Add a real-estate asset to start building informational net-worth context."
      />
    );
  }

  return (
    <>
      <div className="space-y-1">
        {orderedAssets.map((asset) => (
          <RealEstateAssetRow
            key={asset.id}
            asset={asset}
            valuation={latestValuationMap.get(asset.id) ?? null}
            selected={selected.includes(asset.id)}
            selectionMode={selected.length > 0}
            active={activeId === asset.id}
            onToggleSelect={(event) => onToggle(asset, event.shiftKey)}
            onClick={() => {
              setActiveId(asset.id);
              setSelectedAsset(asset);
              setOpen(true);
            }}
          />
        ))}
      </div>

      <DrawerDialog
        open={open}
        onOpenChange={setOpen}
        title="Asset settings"
        description="Manage the informational real-estate record and valuation history."
      >
        {selectedAsset ? (
          <RealEstateAssetForm
            asset={selectedAsset}
            onSuccess={() => {
              setOpen(false);
              setSelectedAsset(null);
            }}
          />
        ) : null}
      </DrawerDialog>
    </>
  );
}

export default AssetsSection;
