"use server";

import {
  buildAlgoliaObjectsRequest,
  getOntologyAlgoliaConfig,
  mapOntologyHits,
  type OntologyAssociationItem,
  validateOntologyCardinality,
} from "@/utils/ontology-associations";
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

export type OntologyAssociationMutationErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "TRANSACTION_NOT_FOUND"
  | "ONTOLOGY_ASSOCIATIONS_DISABLED"
  | "INVALID_CARDINALITY"
  | "ONTOLOGY_CONFIG_MISSING"
  | "ONTOLOGY_SOURCE_FAILED"
  | "ONTOLOGY_SOURCE_MISSING"
  | "PERSISTENCE_FAILED";

type MutationResult =
  | { success: true; items: OntologyAssociationItem[] }
  | {
      success: false;
      error: { code: OntologyAssociationMutationErrorCode; message: string };
    };

function failure(
  code: OntologyAssociationMutationErrorCode,
  message: string,
): MutationResult {
  return { success: false, error: { code, message } };
}

export async function replaceTransactionOntologyAssociations(
  transactionId: string,
  selections: OntologyAssociationItem[],
): Promise<MutationResult> {
  if (!validateOntologyCardinality(selections)) {
    return failure(
      "INVALID_CARDINALITY",
      "People may be selected more than once, but trips, places, and organizations are limited to one each.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("UNAUTHORIZED", "Authentication is required.");

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, wallet_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (!transaction) {
    return failure("TRANSACTION_NOT_FOUND", "Transaction not found.");
  }

  const [{ data: wallet }, { data: walletAccess }] = await Promise.all([
    supabase
      .from("wallets")
      .select("workspace_id")
      .eq("id", transaction.wallet_id)
      .maybeSingle(),
    supabase
      .from("user_wallets")
      .select("role")
      .eq("wallet_id", transaction.wallet_id)
      .eq("user_id", user.id)
      .in("role", ["owner", "editor"])
      .maybeSingle(),
  ]);
  if (!wallet || !walletAccess) {
    return failure("FORBIDDEN", "You cannot edit this transaction.");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("feature_flags")
    .eq("id", wallet.workspace_id)
    .maybeSingle();
  const flags = workspace?.feature_flags
    ? parseFeatureFlags(workspace.feature_flags)
    : DEFAULT_FEATURE_FLAGS;
  if (!flags.ontology_associations_enabled) {
    return failure(
      "ONTOLOGY_ASSOCIATIONS_DISABLED",
      "Canonical transaction context is disabled for this workspace.",
    );
  }

  let verifiedItems: OntologyAssociationItem[] = [];
  if (selections.length > 0) {
    const config = getOntologyAlgoliaConfig();
    if ("missing" in config) {
      return failure(
        "ONTOLOGY_CONFIG_MISSING",
        "The ontology search service is not configured.",
      );
    }

    const sourceObjectIds = Array.from(
      new Set(selections.map((item) => item.sourceObjectId)),
    );
    const { url, init } = buildAlgoliaObjectsRequest(config, sourceObjectIds);

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      return failure(
        "ONTOLOGY_SOURCE_FAILED",
        "The ontology service could not be reached.",
      );
    }
    if (!response.ok) {
      console.error("Ontology object lookup failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return failure(
        "ONTOLOGY_SOURCE_FAILED",
        "The ontology service rejected the lookup.",
      );
    }

    const data = (await response.json()) as { results?: unknown[] };
    verifiedItems = mapOntologyHits(data.results ?? []);
    const verifiedBySourceId = new Map(
      verifiedItems.map((item) => [item.sourceObjectId, item]),
    );
    const everySelectionMatches = selections.every((selection) => {
      const verified = verifiedBySourceId.get(selection.sourceObjectId);
      return (
        verified?.ontologyId === selection.ontologyId &&
        verified.type === selection.type
      );
    });
    if (
      verifiedItems.length !== sourceObjectIds.length ||
      !everySelectionMatches ||
      !validateOntologyCardinality(verifiedItems)
    ) {
      return failure(
        "ONTOLOGY_SOURCE_MISSING",
        "One or more canonical objects are unavailable from the ontology service.",
      );
    }
  }

  const { data: previous } = await supabase
    .from("transaction_ontology_associations")
    .select("transaction_id, ontology_entity_id, entity_type")
    .eq("transaction_id", transactionId);

  let entities: Array<{
    id: string;
    entity_type: string;
    ontology_id: string;
    source_object_id: string;
    canonical_name: string;
    subtitle: string | null;
  }> = [];

  if (verifiedItems.length > 0) {
    const { data, error } = await supabase
      .from("ontology_entities")
      .upsert(
        verifiedItems.map((item) => ({
          workspace_id: wallet.workspace_id,
          ontology_id: item.ontologyId,
          source_object_id: item.sourceObjectId,
          entity_type: item.type,
          canonical_name: item.name,
          subtitle: item.subtitle ?? null,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "workspace_id,entity_type,ontology_id" },
      )
      .select(
        "id, entity_type, ontology_id, source_object_id, canonical_name, subtitle",
      );
    if (error || !data) {
      return failure(
        "PERSISTENCE_FAILED",
        error?.message ?? "Canonical objects could not be saved.",
      );
    }
    entities = data;
  }

  const { error: deleteError } = await supabase
    .from("transaction_ontology_associations")
    .delete()
    .eq("transaction_id", transactionId);
  if (deleteError) {
    return failure("PERSISTENCE_FAILED", deleteError.message);
  }

  if (entities.length > 0) {
    const { error: insertError } = await supabase
      .from("transaction_ontology_associations")
      .insert(
        entities.map((entity) => ({
          transaction_id: transactionId,
          ontology_entity_id: entity.id,
          entity_type: entity.entity_type,
        })),
      );
    if (insertError) {
      if (previous?.length) {
        await supabase
          .from("transaction_ontology_associations")
          .insert(previous);
      }
      return failure("PERSISTENCE_FAILED", insertError.message);
    }
  }

  const entityByCanonicalKey = new Map(
    entities.map((entity) => [
      `${entity.entity_type}:${entity.ontology_id}`,
      entity.id,
    ]),
  );
  return {
    success: true,
    items: verifiedItems.map((item) => ({
      ...item,
      entityId: entityByCanonicalKey.get(`${item.type}:${item.ontologyId}`),
    })),
  };
}
