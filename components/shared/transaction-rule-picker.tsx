"use client";

import { useMemo } from "react";
import { CheckCircle2, Plus, WandSparkles } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { listTransactionRules } from "@/actions/transaction-rules";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategories, useLabels } from "@/contexts/settings-context";
import { useWorkspace } from "@/contexts/workspace-context";
import type { TransactionList } from "@/utils/supabase/types";
import { rankRulesForTransaction } from "@/utils/transaction-rule-improvements";
import type { TransactionRule } from "@/utils/transaction-rules";

interface TransactionRulePickerProps {
  onCreate: () => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (rule: TransactionRule) => void;
  open: boolean;
  transaction: TransactionList | null;
}

function summarizeConditions(rule: TransactionRule) {
  const joiner = rule.matchMode === "all" ? " + " : " or ";
  return rule.conditions
    .map(
      (condition) =>
        `${condition.field.replaceAll("_", " ")} ${condition.operator.replaceAll("_", " ")} “${condition.value}”`,
    )
    .join(joiner);
}

export default function TransactionRulePicker({
  onCreate,
  onOpenChange,
  onSelect,
  open,
  transaction,
}: TransactionRulePickerProps) {
  const { activeWorkspace } = useWorkspace();
  const [, categoryMap] = useCategories();
  const [, labelMap] = useLabels();
  const workspaceId = activeWorkspace?.id;
  const { data: rules = [], isPending } = useQuery({
    queryKey: ["transaction-rules", workspaceId],
    queryFn: () => listTransactionRules(workspaceId!),
    enabled: open && Boolean(workspaceId),
  });
  const rankedRules = useMemo(
    () => (transaction ? rankRulesForTransaction(rules, transaction) : []),
    [rules, transaction],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Improve Automation</DialogTitle>
          <DialogDescription>
            <p className="text-muted-foreground text-sm">
              Choose an automation to teach from this transaction.
            </p>
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search automations…" />
          <CommandList className="max-h-[420px]">
            <CommandEmpty>
              {isPending ? "Loading automations…" : "No automations found."}
            </CommandEmpty>
            <CommandGroup heading="Automations">
              {rankedRules.map(
                ({ alreadyMatches, rule, suggestion }, index) => {
                  const action = rule.actions.categoryId
                    ? `Sets category: ${categoryMap.get(rule.actions.categoryId)?.name ?? "Category"}`
                    : rule.actions.labelId
                      ? `Sets label: ${labelMap.get(rule.actions.labelId)?.name ?? "Label"}`
                      : "Adds transaction context";
                  return (
                    <CommandItem
                      key={rule.id}
                      value={`${rule.name} ${summarizeConditions(rule)} ${action}`}
                      disabled={alreadyMatches}
                      onSelect={() => onSelect(rule)}
                      className="items-start gap-3 py-3"
                    >
                      {alreadyMatches ? (
                        <CheckCircle2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      ) : (
                        <WandSparkles className="text-primary mt-0.5 size-4 shrink-0" />
                      )}
                      <div className="min-w-0 grow">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {rule.name}
                          </span>
                          {index === 0 && suggestion && !alreadyMatches ? (
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                              Recommended
                            </span>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground truncate text-xs capitalize">
                          {summarizeConditions(rule)}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                          <span>{action}</span>
                          <span className="text-muted-foreground shrink-0">
                            {alreadyMatches
                              ? "Already matches"
                              : suggestion
                                ? "Can add pattern"
                                : "Review manually"}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  );
                },
              )}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={onCreate} className="gap-3 py-3">
                <Plus className="size-4" />
                Create New Automation…
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
