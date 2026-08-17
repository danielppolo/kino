"use client";

import { useEffect } from "react";
import { Building2, MapPin, Plane, UserRound } from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import {
  useFeatureFlags,
  useOntologyEntities,
} from "@/contexts/settings-context";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import {
  ONTOLOGY_ASSOCIATION_TYPES,
  type OntologyAssociationType,
} from "@/utils/ontology-associations";

const TYPE_META = {
  person: { label: "Person", Icon: UserRound },
  place: { label: "Place", Icon: MapPin },
  organization: { label: "Organization", Icon: Building2 },
  trip: { label: "Trip", Icon: Plane },
} satisfies Record<
  OntologyAssociationType,
  { label: string; Icon: typeof UserRound }
>;

export default function OntologyFilter() {
  const { ontology_associations_enabled } = useFeatureFlags();
  const [entities] = useOntologyEntities();
  const [filters, setFilters] = useTransactionQueryState();

  useEffect(() => {
    if (!ontology_associations_enabled && filters.ontology_entity_id) {
      void setFilters({ ontology_entity_id: null });
    }
  }, [filters.ontology_entity_id, ontology_associations_enabled, setFilters]);

  if (!ontology_associations_enabled || entities.length === 0) return null;
  const selectedIds = filters.ontology_entity_id.split(",").filter(Boolean);

  return (
    <>
      {ONTOLOGY_ASSOCIATION_TYPES.map((type) => {
        const typeEntities = entities.filter(
          (entity) => entity.entity_type === type,
        );
        if (typeEntities.length === 0) return null;

        const selectedId = selectedIds.find((id) =>
          typeEntities.some((entity) => entity.id === id),
        );
        const { Icon, label } = TYPE_META[type];

        return (
          <div
            className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50"
            key={type}
          >
            <Combobox
              className="w-auto"
              icon={<Icon className="size-4" />}
              options={typeEntities.map((entity) => ({
                value: entity.id,
                label: entity.canonical_name,
                keywords: [entity.subtitle ?? ""],
              }))}
              placeholder={label}
              searchPlaceholder={`Search ${label.toLowerCase()}s…`}
              size="sm"
              value={selectedId ?? ""}
              variant={selectedId ? "secondary" : "ghost"}
              onChange={(value) => {
                const nextIds = selectedIds.filter(
                  (id) => !typeEntities.some((entity) => entity.id === id),
                );
                if (value) nextIds.push(value);
                void setFilters({
                  ontology_entity_id: nextIds.join(",") || null,
                  page: null,
                });
              }}
            />
          </div>
        );
      })}
    </>
  );
}
