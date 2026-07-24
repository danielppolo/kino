"use client";

import { useEffect } from "react";
import { Shapes } from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import {
  useFeatureFlags,
  useOntologyEntities,
} from "@/contexts/settings-context";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

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

  return (
    <Combobox
      className="w-auto"
      icon={<Shapes className="size-4" />}
      options={entities.map((entity) => ({
        value: entity.id,
        label: entity.canonical_name,
        keywords: [entity.entity_type, entity.subtitle ?? ""],
      }))}
      placeholder="Canonical context"
      searchPlaceholder="Search saved context…"
      size="sm"
      value={filters.ontology_entity_id}
      variant={filters.ontology_entity_id ? "secondary" : "ghost"}
      onChange={(value) => setFilters({ ontology_entity_id: value || null })}
    />
  );
}
