"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import CategoryCombobox from "./category-combobox";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";
import { TransactionOntologyEditor } from "./transaction-ontology-editor";
import WalletPicker from "./wallet-picker";

import {
  applyTransactionRuleToHistory,
  createTransactionRule,
  deleteTransactionRule,
  previewTransactionRule,
  updateTransactionRule,
} from "@/actions/transaction-rules";
import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCategories,
  useFeatureFlags,
  useLabels,
  useTags,
  useWallets,
} from "@/contexts/settings-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { parseStoredOntologyAssociations } from "@/utils/ontology-associations";
import type { TransactionList } from "@/utils/supabase/types";
import {
  addImprovementCondition,
  getRuleImprovementSuggestion,
  transactionToRuleCandidate,
} from "@/utils/transaction-rule-improvements";
import {
  matchesTransactionRule,
  type TransactionRule,
  type TransactionRuleCondition,
  type TransactionRuleDefinition,
  transactionRuleDefinitionSchema,
} from "@/utils/transaction-rules";

interface TransactionRuleFormProps {
  defaultPriority?: number;
  onSuccess?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: TransactionRule;
  seedTransaction?: TransactionList | null;
}

const fields: Array<{
  label: string;
  value: TransactionRuleCondition["field"];
}> = [
  { label: "Wallet", value: "wallet_id" },
  { label: "Type", value: "type" },
  { label: "Merchant", value: "merchant" },
  { label: "Description", value: "description" },
  { label: "Amount", value: "amount" },
  { label: "Currency", value: "currency" },
  { label: "Plaid category", value: "plaid_category" },
];

const textOperators: Array<{
  label: string;
  value: TransactionRuleCondition["operator"];
}> = [
  { label: "is", value: "is" },
  { label: "is not", value: "is_not" },
  { label: "contains", value: "contains" },
  { label: "starts with", value: "starts_with" },
];

const amountOperators: typeof textOperators = [
  { label: "equals", value: "is" },
  { label: "does not equal", value: "is_not" },
  { label: "is greater than", value: "greater_than" },
  { label: "is less than", value: "less_than" },
  { label: "is between", value: "between" },
];
const enumOperators = textOperators.slice(0, 2);

function buildDefaultDefinition(
  priority: number,
  transaction?: TransactionList | null,
): TransactionRuleDefinition {
  if (!transaction) {
    return {
      actions: { ontologyAssociations: [], tagIds: [] },
      conditions: [
        {
          field: "description",
          operator: "contains",
          value: "",
        },
      ],
      enabled: true,
      matchMode: "all",
      name: "",
      priority,
      stopProcessing: false,
      triggerSource: "plaid",
    };
  }

  const description = transaction.description ?? "";
  const conditions: TransactionRuleCondition[] = [
    {
      field: "description",
      operator: "is",
      value: description,
    },
    {
      field: "amount",
      operator: "is",
      value: Math.abs(transaction.amount_cents ?? 0),
    },
  ];

  return {
    actions: {
      categoryId: transaction.category_id ?? undefined,
      labelId: transaction.label_id ?? undefined,
      ontologyAssociations: parseStoredOntologyAssociations(
        (
          transaction as TransactionList & {
            ontology_associations?: unknown;
          }
        ).ontology_associations,
      ),
      tagIds: transaction.tag_ids ?? [],
    },
    conditions,
    enabled: true,
    matchMode: "all",
    name: description ? `${description} automation` : "Transaction automation",
    priority,
    stopProcessing: false,
    triggerSource: "plaid",
  };
}

function getDefinition(rule: TransactionRule): TransactionRuleDefinition {
  return {
    actions: rule.actions,
    conditions: rule.conditions,
    enabled: rule.enabled,
    matchMode: rule.matchMode,
    name: rule.name,
    priority: rule.priority,
    stopProcessing: rule.stopProcessing,
    triggerSource: rule.triggerSource,
  };
}

export default function TransactionRuleForm({
  defaultPriority = 1_000_000,
  onSuccess,
  open,
  onOpenChange,
  rule,
  seedTransaction,
}: TransactionRuleFormProps) {
  const { activeWorkspace } = useWorkspace();
  const { ontology_associations_enabled } = useFeatureFlags();
  const [availableTags, tagMap] = useTags();
  const [, categoryMap] = useCategories();
  const [, labelMap] = useLabels();
  const [, walletMap] = useWallets();
  const queryClient = useQueryClient();
  const [definition, setDefinition] = useState<TransactionRuleDefinition>(() =>
    rule
      ? getDefinition(rule)
      : buildDefaultDefinition(defaultPriority, seedTransaction),
  );
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewTransactionRule>
  > | null>(null);
  const [previewDefinitionKey, setPreviewDefinitionKey] = useState<
    string | null
  >(null);
  const [improvementDelta, setImprovementDelta] = useState<number | null>(null);
  const [improvementValue, setImprovementValue] = useState("");
  const [addedImprovementCondition, setAddedImprovementCondition] =
    useState<TransactionRuleCondition | null>(null);

  useEffect(() => {
    if (!open) return;
    setDefinition(
      rule
        ? getDefinition(rule)
        : buildDefaultDefinition(defaultPriority, seedTransaction),
    );
    setPreview(null);
    setPreviewDefinitionKey(null);
    setImprovementDelta(null);
    setImprovementValue(
      rule && seedTransaction
        ? String(
            getRuleImprovementSuggestion(rule, seedTransaction)?.value ?? "",
          )
        : "",
    );
    setAddedImprovementCondition(null);
  }, [defaultPriority, open, rule, seedTransaction]);

  const workspaceId = activeWorkspace?.id;
  const invalidateRules = () =>
    queryClient.invalidateQueries({
      queryKey: ["transaction-rules", workspaceId],
    });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected");
      const parsed = transactionRuleDefinitionSchema.safeParse(definition);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      return rule
        ? updateTransactionRule({
            definition: parsed.data,
            id: rule.id,
            workspaceId,
          })
        : createTransactionRule({
            definition: parsed.data,
            workspaceId,
          });
    },
    onSuccess: () => {
      void invalidateRules();
      toast.success(rule ? "Automation updated" : "Automation created");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !rule) return;
      await deleteTransactionRule({ id: rule.id, workspaceId });
    },
    onSuccess: () => {
      void invalidateRules();
      toast.success("Automation deleted");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected");
      const parsed = transactionRuleDefinitionSchema.parse(definition);
      return previewTransactionRule({
        definition: parsed,
        workspaceId,
      });
    },
    onSuccess: (result) => {
      setPreview(result);
      setPreviewDefinitionKey(JSON.stringify(definition));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const historyMutation = useMutation({
    mutationFn: async (overwrite: boolean) => {
      if (!workspaceId || !rule) throw new Error("Save the rule first");
      return applyTransactionRuleToHistory({
        id: rule.id,
        overwrite,
        workspaceId,
      });
    },
    onSuccess: ({ updatedCount }) => {
      void Promise.all([
        invalidateRules(),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
      toast.success(`Updated ${updatedCount} past transactions`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const improvementSuggestion = useMemo(
    () =>
      rule && seedTransaction
        ? getRuleImprovementSuggestion(rule, seedTransaction)
        : null,
    [rule, seedTransaction],
  );
  const suggestionAdded = Boolean(
    addedImprovementCondition &&
      definition.conditions.some(
        (condition) =>
          condition.field === addedImprovementCondition.field &&
          condition.operator === addedImprovementCondition.operator &&
          String(condition.value).toLocaleLowerCase() ===
            String(addedImprovementCondition.value).toLocaleLowerCase(),
      ),
  );
  const seedMatchesDefinition = useMemo(() => {
    if (!rule || !seedTransaction) return false;
    return matchesTransactionRule(
      { ...rule, ...definition },
      transactionToRuleCandidate(seedTransaction),
    );
  }, [definition, rule, seedTransaction]);

  const improvementPreviewMutation = useMutation({
    mutationFn: async (nextDefinition: TransactionRuleDefinition) => {
      if (!workspaceId || !rule) throw new Error("No automation selected");
      const [before, after] = await Promise.all([
        previewTransactionRule({
          definition: getDefinition(rule),
          workspaceId,
        }),
        previewTransactionRule({ definition: nextDefinition, workspaceId }),
      ]);
      return { after, delta: after.count - before.count, nextDefinition };
    },
    onSuccess: ({ after, delta, nextDefinition }) => {
      setImprovementDelta(delta);
      setPreview(after);
      setPreviewDefinitionKey(JSON.stringify(nextDefinition));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const summary = useMemo(() => {
    const joiner = definition.matchMode === "all" ? " and " : " or ";
    const conditions = definition.conditions
      .map((condition) => {
        const value =
          condition.field === "wallet_id"
            ? (walletMap.get(String(condition.value))?.name ?? condition.value)
            : condition.field === "amount"
              ? (Number(condition.value) / 100).toFixed(2)
              : condition.value;
        return `${fields.find((field) => field.value === condition.field)?.label ?? condition.field} ${condition.operator.replaceAll("_", " ")} ${value}`;
      })
      .join(joiner);
    const actions = [
      definition.actions.categoryId
        ? `category to ${categoryMap.get(definition.actions.categoryId)?.name ?? "selected category"}`
        : null,
      definition.actions.labelId
        ? `label to ${labelMap.get(definition.actions.labelId)?.name ?? "selected label"}`
        : null,
      definition.actions.tagIds.length > 0
        ? `add ${definition.actions.tagIds
            .map((tagId) => tagMap.get(tagId)?.title)
            .filter(Boolean)
            .join(", ")}`
        : null,
      definition.actions.ontologyAssociations.length > 0
        ? "canonical context"
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    return conditions && actions
      ? `If ${conditions}, then set ${actions}.`
      : conditions;
  }, [
    categoryMap,
    definition.actions,
    definition.conditions,
    definition.matchMode,
    labelMap,
    tagMap,
    walletMap,
  ]);
  const currentPreview =
    previewDefinitionKey === JSON.stringify(definition) ? preview : null;

  const updateCondition = (
    index: number,
    patch: Partial<TransactionRuleCondition>,
  ) => {
    setDefinition((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) =>
        conditionIndex === index ? { ...condition, ...patch } : condition,
      ),
    }));
    setPreview(null);
  };

  const isBusy =
    saveMutation.isPending ||
    deleteMutation.isPending ||
    previewMutation.isPending ||
    improvementPreviewMutation.isPending ||
    historyMutation.isPending;

  const addSuggestedPattern = () => {
    const value = improvementValue.trim();
    if (!improvementSuggestion || !value) return;
    const addedCondition = { ...improvementSuggestion, value };
    const nextDefinition = addImprovementCondition(definition, addedCondition);
    setDefinition(nextDefinition);
    setAddedImprovementCondition(addedCondition);
    setImprovementDelta(null);
    improvementPreviewMutation.mutate(nextDefinition);
  };

  const improvementMode = Boolean(rule && seedTransaction);
  const transactionAmount = seedTransaction
    ? new Intl.NumberFormat(undefined, {
        currency: seedTransaction.currency ?? "USD",
        style: "currency",
      }).format((seedTransaction.amount_cents ?? 0) / 100)
    : null;
  const transactionDate = seedTransaction?.date
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(`${seedTransaction.date}T00:00:00`),
      )
    : null;

  return (
    <DrawerDialog
      title={
        improvementMode
          ? `Improve ${rule?.name}`
          : rule
            ? "Edit automation"
            : "Add automation"
      }
      description={
        improvementMode
          ? "Teach this automation to recognize the selected transaction."
          : "When a Plaid transaction matches, automatically classify it."
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        {rule ? (
          <dl className="bg-muted/50 grid grid-cols-2 gap-3 rounded-md p-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Matches</dt>
              <dd className="font-medium tabular-nums">
                {rule.matchCount ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Last Run</dt>
              <dd className="font-medium">
                {rule.lastMatchedAt
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                    }).format(new Date(rule.lastMatchedAt))
                  : "Never"}
              </dd>
            </div>
          </dl>
        ) : null}

        {improvementMode && seedTransaction ? (
          <section className="space-y-3 rounded-md border p-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                This Transaction
              </p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {seedTransaction.plaid_merchant_name ||
                      seedTransaction.description ||
                      "Unnamed transaction"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {[
                      transactionDate,
                      walletMap.get(seedTransaction.wallet_id ?? "")?.name,
                      seedTransaction.type,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {transactionAmount}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Merchant</dt>
              <dd className="truncate">
                {seedTransaction.plaid_merchant_name || "Unavailable"}
              </dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="break-words">
                {seedTransaction.description || "Unavailable"}
              </dd>
              <dt className="text-muted-foreground">Plaid Category</dt>
              <dd className="truncate">
                {seedTransaction.plaid_personal_finance_category_primary ||
                  "Unavailable"}
              </dd>
            </dl>

            {improvementSuggestion ? (
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <p className="font-medium">Suggested Pattern</p>
                {suggestionAdded ? (
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-muted-foreground break-words capitalize">
                      {addedImprovementCondition?.field.replaceAll("_", " ")}{" "}
                      contains “{addedImprovementCondition?.value}”
                    </p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span>
                        {seedMatchesDefinition
                          ? "This transaction now matches."
                          : "Review the conditions before updating."}
                        {improvementPreviewMutation.isPending
                          ? " Checking past transactions…"
                          : improvementDelta !== null
                            ? ` ${Math.max(0, improvementDelta)} additional past transactions match.`
                            : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <Label htmlFor="suggested-rule-pattern" className="sr-only">
                      Suggested pattern value
                    </Label>
                    <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 text-xs">
                      <span className="capitalize">
                        {improvementSuggestion.field.replaceAll("_", " ")}
                      </span>
                      <span className="text-muted-foreground">contains</span>
                      <Input
                        id="suggested-rule-pattern"
                        name="suggested-rule-pattern"
                        autoComplete="off"
                        value={improvementValue}
                        onChange={(event) =>
                          setImprovementValue(event.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addSuggestedPattern}
                      disabled={isBusy || improvementValue.trim().length === 0}
                    >
                      <Plus className="mr-2 size-4" />
                      Add to Rule
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <p>
                  This automation uses mixed or grouped-by-AND conditions.
                  Review it manually so adding an OR pattern does not broaden
                  the rule unexpectedly.
                </p>
              </div>
            )}
          </section>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="rule-name">Name</Label>
          <Input
            id="rule-name"
            value={definition.name}
            onChange={(event) =>
              setDefinition((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Coffee shop purchases"
          />
        </div>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium">When</p>
            <p className="text-muted-foreground text-xs">
              A transaction is imported from Plaid
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Match</span>
            <Select
              value={definition.matchMode}
              onValueChange={(value: "all" | "any") =>
                setDefinition((current) => ({
                  ...current,
                  matchMode: value,
                }))
              }
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm">conditions</span>
          </div>

          {definition.conditions.map((condition, index) => {
            const operators =
              condition.field === "amount"
                ? amountOperators
                : ["wallet_id", "type", "currency"].includes(condition.field)
                  ? enumOperators
                  : textOperators;
            return (
              <div
                key={`${condition.field}-${index}`}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]"
              >
                <Select
                  value={condition.field}
                  onValueChange={(field: TransactionRuleCondition["field"]) =>
                    updateCondition(index, {
                      field,
                      operator: "is",
                      value: field === "amount" ? 0 : "",
                      valueTo: undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={condition.operator}
                  onValueChange={(
                    operator: TransactionRuleCondition["operator"],
                  ) => updateCondition(index, { operator })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.value} value={operator.value}>
                        {operator.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {condition.field === "wallet_id" ? (
                  <WalletPicker
                    value={String(condition.value)}
                    onChange={(value) => updateCondition(index, { value })}
                    className="w-full"
                  />
                ) : condition.field === "type" ? (
                  <Select
                    value={String(condition.value)}
                    onValueChange={(value) => updateCondition(index, { value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type={condition.field === "amount" ? "number" : "text"}
                      step={condition.field === "amount" ? "0.01" : undefined}
                      value={
                        condition.field === "amount"
                          ? Number(condition.value) / 100
                          : condition.value
                      }
                      onChange={(event) =>
                        updateCondition(index, {
                          value:
                            condition.field === "amount"
                              ? Math.round(Number(event.target.value) * 100)
                              : event.target.value,
                        })
                      }
                    />
                    {condition.operator === "between" && (
                      <Input
                        type="number"
                        step="0.01"
                        value={(condition.valueTo ?? 0) / 100}
                        onChange={(event) =>
                          updateCondition(index, {
                            valueTo: Math.round(
                              Number(event.target.value) * 100,
                            ),
                          })
                        }
                      />
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove condition"
                  onClick={() =>
                    setDefinition((current) => ({
                      ...current,
                      conditions: current.conditions.filter(
                        (_, conditionIndex) => conditionIndex !== index,
                      ),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setDefinition((current) => ({
                ...current,
                conditions: [
                  ...current.conditions,
                  { field: "description", operator: "contains", value: "" },
                ],
              }))
            }
          >
            <Plus className="mr-2 size-4" />
            Add condition
          </Button>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-medium">Then</p>
          <div className="grid grid-cols-2 gap-3">
            <CategoryCombobox
              selectionType="combobox"
              value={definition.actions.categoryId ?? ""}
              onChange={(categoryId) =>
                setDefinition((current) => ({
                  ...current,
                  actions: {
                    ...current.actions,
                    categoryId: categoryId || undefined,
                  },
                }))
              }
              className="w-full"
            />
            <LabelCombobox
              value={definition.actions.labelId ?? ""}
              onChange={(labelId) =>
                setDefinition((current) => ({
                  ...current,
                  actions: {
                    ...current.actions,
                    labelId: labelId || undefined,
                  },
                }))
              }
              className="w-full"
            />
          </div>
          <TagMultiSelect
            options={availableTags}
            value={definition.actions.tagIds}
            onChange={(tagIds) =>
              setDefinition((current) => ({
                ...current,
                actions: { ...current.actions, tagIds },
              }))
            }
          />
          {ontology_associations_enabled && workspaceId ? (
            <TransactionOntologyEditor
              workspaceId={workspaceId}
              value={definition.actions.ontologyAssociations}
              onChange={(ontologyAssociations) =>
                setDefinition((current) => ({
                  ...current,
                  actions: { ...current.actions, ontologyAssociations },
                }))
              }
            />
          ) : null}
        </section>

        <div className="bg-muted/50 rounded-md p-3 text-xs">
          <span className="font-medium">Rule summary: </span>
          {summary || "Add conditions to describe matching transactions."}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="rule-enabled">Enabled</Label>
            <p className="text-muted-foreground text-xs">
              Run this automation on future Plaid imports.
            </p>
          </div>
          <Switch
            id="rule-enabled"
            checked={definition.enabled}
            onCheckedChange={(enabled) =>
              setDefinition((current) => ({ ...current, enabled }))
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="stop-processing">Stop lower-priority rules</Label>
            <p className="text-muted-foreground text-xs">
              Do not evaluate rules below this one after it matches.
            </p>
          </div>
          <Switch
            id="stop-processing"
            checked={definition.stopProcessing}
            onCheckedChange={(stopProcessing) =>
              setDefinition((current) => ({ ...current, stopProcessing }))
            }
          />
        </div>

        {currentPreview && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{currentPreview.count} past matches</p>
            <p className="text-muted-foreground text-xs">
              {currentPreview.fillEmptyCount} can fill empty fields;{" "}
              {currentPreview.overwriteCount} have conflicting classifications.
            </p>
            {currentPreview.samples.map((sample) => (
              <p key={sample.id} className="mt-2 truncate text-xs">
                {sample.date} · {sample.description || "No description"} ·{" "}
                {(Math.abs(sample.amountCents) / 100).toFixed(2)}{" "}
                {sample.currency}
              </p>
            ))}
            {rule && currentPreview.count > 0 && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => historyMutation.mutate(false)}
                  disabled={isBusy}
                >
                  Fill empty fields
                </Button>
                {currentPreview.overwriteCount > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Overwrite category or label on ${currentPreview.overwriteCount} matching transactions? This cannot be automatically undone.`,
                        )
                      ) {
                        historyMutation.mutate(true);
                      }
                    }}
                    disabled={isBusy}
                  >
                    Overwrite classifications
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {rule && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this automation and its match history?",
                    )
                  ) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={isBusy}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => previewMutation.mutate()}
              disabled={isBusy}
            >
              Test rule
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={isBusy}
            >
              {improvementMode
                ? `Update ${rule?.name}`
                : rule
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </DrawerDialog>
  );
}
