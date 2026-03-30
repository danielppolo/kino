"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Building2, Link2 } from "lucide-react";

import SelectableRow from "@/components/shared/selectable-row";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/typography";
import { RealEstateAsset, RealEstateAssetValuation } from "@/utils/supabase/types";

interface RealEstateAssetRowProps {
  asset: RealEstateAsset;
  valuation?: RealEstateAssetValuation | null;
  selected?: boolean;
  selectionMode?: boolean;
  active?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function RealEstateAssetRow({
  asset,
  valuation,
  selected = false,
  selectionMode = false,
  active = false,
  onClick,
  onToggleSelect,
}: RealEstateAssetRowProps) {
  return (
    <SelectableRow
      id={asset.id}
      selected={selected}
      selectionMode={selectionMode}
      active={active}
      onClick={onClick}
      onToggleSelect={onToggleSelect}
    >
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Text className="truncate">{asset.name}</Text>
              <Badge variant="outline" className="capitalize">
                {asset.status.replace("_", " ")}
              </Badge>
            </div>
            <Text muted className="truncate text-xs">
              {asset.asset_type.replaceAll("_", " ")}
              {asset.origin_transaction_id ? " • linked purchase transaction" : ""}
            </Text>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {asset.origin_transaction_id ? (
            <Badge variant="secondary" className="gap-1">
              <Link2 className="size-3" />
              Linked
            </Badge>
          ) : null}
          <div className="text-right">
            <Text className="text-sm">
              {valuation
                ? formatMoney(valuation.valuation_amount_cents, asset.currency)
                : "No valuation"}
            </Text>
            <Text muted className="text-xs">
              {valuation
                ? `${formatDistanceToNowStrict(
                    new Date(`${valuation.valuation_date}T00:00:00`),
                    { addSuffix: true },
                  )}`
                : "Add a valuation"}
            </Text>
          </div>
        </div>
      </div>
    </SelectableRow>
  );
}

export default RealEstateAssetRow;
