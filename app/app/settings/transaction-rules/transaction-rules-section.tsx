"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listTransactionRules,
  reorderTransactionRules,
  setTransactionRuleEnabled,
} from "@/actions/transaction-rules";
import EmptyState from "@/components/shared/empty-state";
import PageHeader from "@/components/shared/page-header";
import SelectableRow from "@/components/shared/selectable-row";
import SettingsListLoading from "@/components/shared/settings-list-loading";
import TransactionRuleForm from "@/components/shared/transaction-rule-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/typography";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useWorkspace } from "@/contexts/workspace-context";
import type { TransactionRule } from "@/utils/transaction-rules";

function summarizeRule(rule: TransactionRule) {
  const fields = rule.conditions
    .map((condition) => condition.field.replaceAll("_", " "))
    .join(rule.matchMode === "all" ? " + " : " or ");
  const actions = [
    rule.actions.categoryId ? "category" : null,
    rule.actions.labelId ? "label" : null,
    rule.actions.tagIds.length > 0 ? "tags" : null,
    rule.actions.ontologyAssociations.length > 0 ? "canonical context" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `${fields} → ${actions}`;
}

export default function TransactionRulesSection() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editRule, setEditRule] = useState<TransactionRule>();

  const { data: rules = [], isPending } = useQuery({
    queryKey: ["transaction-rules", workspaceId],
    queryFn: () => listTransactionRules(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["transaction-rules", workspaceId],
    });

  const enabledMutation = useMutation({
    mutationFn: (input: { enabled: boolean; id: string }) =>
      setTransactionRuleEnabled({ ...input, workspaceId: workspaceId! }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      reorderTransactionRules({ ids, workspaceId: workspaceId! }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const moveRule = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= rules.length) return;
    const ids = rules.map((rule) => rule.id);
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    reorderMutation.mutate(ids);
  };

  if (isPending) return <SettingsListLoading />;

  return (
    <>
      <PageHeader className="justify-end">
        <TooltipButton
          size="sm"
          variant="outline"
          tooltip="Add automation"
          onClick={() => {
            setEditRule(undefined);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
        </TooltipButton>
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        {rules.length === 0 ? (
          <EmptyState
            title="No automations yet"
            description="Create a rule to classify future Plaid transactions."
          />
        ) : (
          rules.map((rule, index) => (
            <SelectableRow
              key={rule.id}
              id={rule.id}
              onClick={() => {
                setEditRule(rule);
                setOpen(true);
              }}
            >
              <Switch
                checked={rule.enabled}
                aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={(enabled) =>
                  enabledMutation.mutate({ enabled, id: rule.id })
                }
              />
              <div className="min-w-0 grow">
                <Text className="truncate font-medium">{rule.name}</Text>
                <p className="text-muted-foreground truncate text-xs">
                  {summarizeRule(rule)}
                </p>
              </div>
              <div className="text-muted-foreground hidden text-right text-xs sm:block">
                <p>{rule.matchCount ?? 0} matches</p>
                <p>
                  {rule.lastMatchedAt
                    ? `Last ${new Date(rule.lastMatchedAt).toLocaleDateString()}`
                    : "Never run"}
                </p>
              </div>
              <div className="flex">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move rule up"
                  disabled={index === 0 || reorderMutation.isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    moveRule(index, -1);
                  }}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move rule down"
                  disabled={
                    index === rules.length - 1 || reorderMutation.isPending
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    moveRule(index, 1);
                  }}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </SelectableRow>
          ))
        )}
      </div>

      <TransactionRuleForm
        open={open}
        onOpenChange={setOpen}
        rule={editRule}
        defaultPriority={rules.length}
      />
    </>
  );
}
