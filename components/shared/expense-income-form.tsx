"use client";

import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import {
  CalendarDays,
  Folder,
  Network,
  Repeat2,
  Tags,
  Trash,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { v4 as randomUUID } from "uuid";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SubmitButton } from "../submit-button";
import { Switch } from "../ui/switch";
import {
  type AmountFormValue,
  getAmountFormValue,
  normalizeAmountFormValue,
} from "./amount-form-value";
import { AmountInput } from "./amount-input";
import BillCombobox from "./bill-combobox";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";
import TemplateSelect from "./template-select";
import { TransactionColorIcon } from "./transaction-color";
import { TransactionOntologyEditor } from "./transaction-ontology-editor";

import { createTransaction } from "@/actions/create-transaction";
import { replaceTransactionOntologyAssociations } from "@/actions/ontology-associations";
import CategoryCombobox from "@/components/shared/category-combobox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useFeatureFlags,
  useLabels,
  useTags,
  useWallets,
} from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { useWorkspace } from "@/contexts/workspace-context";
import useFilters from "@/hooks/use-filters";
import {
  type OntologyAssociationItem,
  parseStoredOntologyAssociations,
} from "@/utils/ontology-associations";
import {
  applyOptimisticTransaction,
  findTransactionById,
  type InfiniteTransactionData,
} from "@/utils/optimistic-transactions";
import { createClient } from "@/utils/supabase/client";
import {
  deleteTransaction,
  setTransactionBills,
} from "@/utils/supabase/mutations";
import { getBillsForTransaction } from "@/utils/supabase/queries";
import { Transaction, TransactionList } from "@/utils/supabase/types";

interface ExpenseIncomeFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense";
  onSuccess?: () => void;
  initialData?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ExpenseIncomeFormValues = {
  id?: string;
  amount: AmountFormValue;
  type: "income" | "expense";
  date: string;
  description?: string;
  category_id: string;
  label_id: string;
  wallet_id: string;
  currency: string;
  tags?: string[];
  bill_id?: string;
  ontologyAssociations: OntologyAssociationItem[];
};

type ExpenseIncomeMutationValues = Omit<ExpenseIncomeFormValues, "amount"> & {
  amount: number;
};

const ExpenseIncomeForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
  initialData,
  open,
  onOpenChange,
}: ExpenseIncomeFormProps) => {
  const [wallets, walletMap] = useWallets();
  const { bills_enabled, ontology_associations_enabled } = useFeatureFlags();
  const { activeWorkspace } = useWorkspace();
  const filters = useFilters();
  const [availableTags] = useTags();
  const [, labelMap] = useLabels();
  const [addAnother, setAddAnother] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { billPrefill } = useTransactionForm();
  const workspaceWalletIds = wallets.map((wallet) => wallet.id);
  const transactionsQueryKey = [
    "transactions",
    filters,
    workspaceWalletIds,
  ] as const;

  const { mutateAsync, isPending } = useMutation<
    {
      data: Transaction[];
      ontologyAssociations: OntologyAssociationItem[];
    },
    Error,
    ExpenseIncomeMutationValues,
    {
      previousData?: InfiniteTransactionData;
      optimisticTransaction: TransactionList;
    }
  >({
    mutationFn: async (values) => {
      const { ontologyAssociations, ...transactionValues } = values;
      const result = await createTransaction(transactionValues);
      if (!result.success)
        throw new Error(result.error ?? "Failed to create transaction");

      const transactionId = result.data?.[0]?.id ?? values.id;
      let savedAssociations = ontologyAssociations;
      if (ontology_associations_enabled && transactionId) {
        const associationResult = await replaceTransactionOntologyAssociations(
          transactionId,
          ontologyAssociations,
        );
        if (!associationResult.success) {
          throw new Error(associationResult.error.message);
        }
        savedAssociations = associationResult.items;
      }

      return {
        data: result.data ?? [],
        ontologyAssociations: savedAssociations,
      };
    },
    onMutate: async (newTransaction) => {
      await queryClient.cancelQueries({
        queryKey: transactionsQueryKey,
      });

      const previousData =
        queryClient.getQueryData<InfiniteTransactionData>(transactionsQueryKey);
      const existingTransaction = findTransactionById(
        previousData,
        newTransaction.id,
      );

      const amountCents =
        newTransaction.type === "expense"
          ? -Math.round(newTransaction.amount * 100)
          : Math.round(newTransaction.amount * 100);
      const optimisticTransaction: TransactionList = {
        ...existingTransaction,
        id: newTransaction.id ?? randomUUID(),
        wallet_id: newTransaction.wallet_id,
        category_id: newTransaction.category_id || null,
        label_id: newTransaction.label_id || null,
        amount_cents: amountCents,
        base_amount_cents: existingTransaction?.base_amount_cents ?? null,
        created_at: existingTransaction?.created_at ?? null,
        currency: newTransaction.currency,
        date: newTransaction.date,
        description: newTransaction.description ?? null,
        needs_review: !newTransaction.category_id || !newTransaction.label_id,
        note: existingTransaction?.note ?? null,
        ontology_associations:
          newTransaction.ontologyAssociations as unknown as TransactionList["ontology_associations"],
        ontology_entity_ids: newTransaction.ontologyAssociations.flatMap(
          (item) => (item.entityId ? [item.entityId] : []),
        ),
        plaid_merchant_key: existingTransaction?.plaid_merchant_key ?? null,
        plaid_merchant_name: existingTransaction?.plaid_merchant_name ?? null,
        plaid_pending_transaction_id:
          existingTransaction?.plaid_pending_transaction_id ?? null,
        plaid_personal_finance_category_primary:
          existingTransaction?.plaid_personal_finance_category_primary ?? null,
        plaid_transaction_id: existingTransaction?.plaid_transaction_id ?? null,
        tag_ids: newTransaction.tags ?? null,
        tags: newTransaction.tags ?? null,
        transfer_id: existingTransaction?.transfer_id ?? null,
        transfer_wallet_id: existingTransaction?.transfer_wallet_id ?? null,
        type: newTransaction.type,
      };

      queryClient.setQueryData<InfiniteTransactionData>(
        transactionsQueryKey,
        (old) =>
          applyOptimisticTransaction(
            old,
            optimisticTransaction,
            newTransaction.id,
          ),
      );

      return { previousData, optimisticTransaction };
    },
    onError: (_err, _newTransaction, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(transactionsQueryKey, context.previousData);
      }
    },
    onSuccess: (data, _variables, context) => {
      const saved = data?.data?.[0];
      if (!saved || !context?.optimisticTransaction) return;

      const savedTags = (saved as { tags?: string[] | null }).tags ?? null;
      const updatedTransaction: TransactionList = {
        id: saved.id,
        wallet_id: saved.wallet_id,
        category_id: saved.category_id,
        label_id: saved.label_id ?? null,
        amount_cents: saved.amount_cents,
        base_amount_cents: saved.base_amount_cents ?? null,
        created_at: saved.created_at ?? null,
        currency: saved.currency,
        date: saved.date,
        description: saved.description ?? null,
        needs_review: !saved.category_id || !saved.label_id,
        note: (saved as { note?: string | null }).note ?? null,
        ontology_associations:
          data.ontologyAssociations as unknown as TransactionList["ontology_associations"],
        ontology_entity_ids: data.ontologyAssociations.flatMap((item) =>
          item.entityId ? [item.entityId] : [],
        ),
        plaid_merchant_key: saved.plaid_merchant_key ?? null,
        plaid_merchant_name: saved.plaid_merchant_name ?? null,
        plaid_pending_transaction_id:
          saved.plaid_pending_transaction_id ?? null,
        plaid_personal_finance_category_primary:
          saved.plaid_personal_finance_category_primary ?? null,
        plaid_transaction_id: saved.plaid_transaction_id ?? null,
        tag_ids: savedTags,
        tags: savedTags,
        transfer_id:
          (saved as { transfer_id?: string | null }).transfer_id ?? null,
        transfer_wallet_id: null,
        type: saved.type,
      };

      queryClient.setQueryData<InfiniteTransactionData>(
        transactionsQueryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((t) =>
                t.id === context.optimisticTransaction.id
                  ? updatedTransaction
                  : t,
              ),
            })),
          };
        },
      );
    },
    onSettled: () => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: transactionsQueryKey,
        }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["cashflow-breakdown"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      // Remove the transaction from all transaction queries
      queryClient.setQueriesData<InfiniteTransactionData>(
        { queryKey: ["transactions"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((t) => t.id !== initialData?.id),
            })),
          };
        },
      );

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["cashflow-breakdown"] }),
      ]);
    },
  });

  const defaultValues: ExpenseIncomeFormValues = {
    type: type as "income" | "expense",
    wallet_id: walletId,
    date: date,
    currency: walletMap.get(walletId)?.currency ?? "USD",
    description: "",
    category_id: "",
    label_id: "",
    amount: getAmountFormValue(
      initialData
        ? Math.abs(initialData.amount_cents) / 100
        : billPrefill
          ? billPrefill.amount / 100
          : undefined,
    ),
    tags: initialData?.tags ?? [],
    bill_id: billPrefill?.billId ?? "",
    ontologyAssociations: parseStoredOntologyAssociations(
      (
        initialData as unknown as
          | { ontology_associations?: unknown }
          | undefined
      )?.ontology_associations,
    ),
  };

  const handleSubmit = async (values: ExpenseIncomeFormValues) => {
    try {
      // Check if amount has changed (for edits)
      const isEdit = initialData && values.id;
      const originalAmount = initialData
        ? Math.abs(initialData.amount_cents) / 100
        : 0;
      const amount = normalizeAmountFormValue(values.amount);
      const mutationValues: ExpenseIncomeMutationValues = {
        ...values,
        amount,
      };
      const amountChanged = isEdit && amount !== originalAmount;

      // IMPORTANT: If editing and amount hasn't changed, preserve existing bill_payments
      // This prevents losing bill associations when editing other transaction fields
      // If amount changes, we clear bill_payments as the split amounts are no longer valid
      let existingBillIds: string[] = [];
      if (isEdit && !amountChanged && values.id) {
        const supabase = await createClient();
        const billsResult = await getBillsForTransaction(supabase, values.id);
        if (billsResult.data) {
          existingBillIds = billsResult.data.map((bill) => bill.id);
        }
      }

      const result = await mutateAsync(mutationValues);
      const transactionId = result?.data?.[0]?.id ?? mutationValues.id;

      // Handle bill linking
      if (transactionId) {
        if (isEdit && !amountChanged && existingBillIds.length > 0) {
          // Preserve existing bill links when amount hasn't changed
          await setTransactionBills(transactionId, existingBillIds);
          queryClient.invalidateQueries({ queryKey: ["bills"] });
          queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
        } else if (values.bill_id) {
          // Link to new bill (for new transactions or when user selected a bill)
          await setTransactionBills(transactionId, [values.bill_id]);
          queryClient.invalidateQueries({ queryKey: ["bills"] });
          queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
        } else if (!isEdit || amountChanged) {
          // Clear bill links for new transactions without bill or when amount changed
          await setTransactionBills(transactionId, []);
          queryClient.invalidateQueries({ queryKey: ["bills"] });
          queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
        }
      }

      return {
        error: undefined,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create transaction",
      };
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return { error: "No transaction ID provided" };
    try {
      await deleteMutation.mutateAsync(initialData.id);
      return { error: undefined };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete transaction",
      };
    }
  };

  const convertToFormValues = (
    transaction: Transaction,
  ): ExpenseIncomeFormValues => ({
    id: transaction.id,
    amount: getAmountFormValue(Math.abs(transaction.amount_cents) / 100),
    type: transaction.type as "income" | "expense",
    date: transaction.date,
    description: transaction.description ?? undefined,
    category_id: transaction.category_id ?? "",
    label_id: transaction.label_id ?? "",
    wallet_id: transaction.wallet_id,
    currency: transaction.currency,
    tags:
      (transaction as { tag_ids?: string[] | null; tags?: string[] | null })
        .tag_ids ??
      (transaction as { tags?: string[] | null }).tags ??
      undefined,
    bill_id: "",
    ontologyAssociations: parseStoredOntologyAssociations(
      (transaction as unknown as { ontology_associations?: unknown })
        .ontology_associations,
    ),
  });

  const handleRepeat = async (values: ExpenseIncomeFormValues) => {
    const repeatValues: ExpenseIncomeMutationValues = {
      ...values,
      id: undefined,
      date: format(Date.now(), "yyyy-MM-dd"),
      amount: normalizeAmountFormValue(values.amount),
    };

    try {
      await mutateAsync(repeatValues);
      return { error: undefined };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create transaction",
      };
    }
  };

  const entityValues = initialData
    ? convertToFormValues(initialData)
    : undefined;
  const form = useForm<ExpenseIncomeFormValues>({
    defaultValues: entityValues ?? defaultValues,
  });
  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (open) {
      form.reset(entityValues ?? defaultValues);
      setDatePickerOpen(false);
    }
    // Reset only when the modal opens or the edited transaction changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, open]);

  const submitForm = async (values: ExpenseIncomeFormValues) => {
    const { error } = await handleSubmit(values);
    if (error) {
      toast.error(error);
      return;
    }

    toast.success(isEdit ? "Updated successfully!" : "Created successfully!");
    if (!addAnother) onSuccess?.();
  };

  const deleteForm = async () => {
    const { error } = await handleDelete();
    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Deleted successfully!");
    onSuccess?.();
  };

  const repeatForm = async () => {
    const { error } = await handleRepeat(form.getValues());
    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Repeated successfully!");
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl p-0">
        <Form {...form}>
          <form
            className="flex h-[min(34rem,90vh)] flex-col"
            onSubmit={(event) => {
              const submitter = (event.nativeEvent as SubmitEvent).submitter;
              if (submitter?.getAttribute("type") !== "submit") {
                event.preventDefault();
                return;
              }
              void form.handleSubmit(submitForm)(event);
            }}
          >
            <DialogHeader className="flex-row items-center gap-3 space-y-0 px-6 pt-6 sm:px-8">
              <DialogTitle className="capitalize">
                {isEdit ? `Edit ${type}` : `Add ${type}`}
              </DialogTitle>
              <span className="text-muted-foreground">›</span>
              <TemplateSelect type={type} />
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-10 sm:px-8">
              <FormField
                name="amount"
                rules={{
                  required: "Amount is required",
                  min: { value: 0.01, message: "Amount must be positive" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AmountInput
                        {...field}
                        autoFocus
                        variant="ghost"
                        className="h-auto text-3xl font-semibold shadow-none focus-visible:ring-0 sm:text-4xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DescriptionInput
                        {...field}
                        value={field.value ?? ""}
                        workspaceId={activeWorkspace?.id}
                        variant="ghost"
                        placeholder="Add description…"
                        className="h-auto px-0 py-2 text-lg shadow-none focus-visible:ring-0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <FormField
                  name="category_id"
                  rules={{ required: "Category is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CategoryCombobox
                          {...field}
                          type={type}
                          selectionType="combobox"
                          size="sm"
                          icon={<Folder className="size-4" />}
                          placeholder="Category"
                          className="w-auto max-w-56 rounded-full"
                        />
                      </FormControl>
                      <FormMessage className="sr-only" />
                    </FormItem>
                  )}
                />
                <FormField
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <Popover
                        open={datePickerOpen}
                        onOpenChange={setDatePickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 rounded-full font-normal"
                          >
                            <CalendarDays className="size-4" />
                            {field.value
                              ? format(
                                  parse(field.value, "yyyy-MM-dd", new Date()),
                                  "MMM d, yyyy",
                                )
                              : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              field.value
                                ? parse(field.value, "yyyy-MM-dd", new Date())
                                : undefined
                            }
                            defaultMonth={
                              field.value
                                ? parse(field.value, "yyyy-MM-dd", new Date())
                                : undefined
                            }
                            onSelect={(selectedDate) => {
                              field.onChange(
                                selectedDate
                                  ? format(selectedDate, "yyyy-MM-dd")
                                  : undefined,
                              );
                              if (selectedDate) setDatePickerOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
                <FormField
                  name="label_id"
                  rules={{ required: "Label is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <LabelCombobox
                          {...field}
                          size="sm"
                          icon={
                            <TransactionColorIcon
                              color={labelMap.get(field.value ?? "")?.color}
                            />
                          }
                          placeholder="Label"
                          compact
                          className="w-auto rounded-full"
                        />
                      </FormControl>
                      <FormMessage className="sr-only" />
                    </FormItem>
                  )}
                />
                <FormField
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TagMultiSelect
                          {...field}
                          options={availableTags}
                          placeholder="Tags"
                          compact
                          icon={<Tags className="size-4" />}
                          className="min-h-8 w-auto rounded-full p-0"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {type === "expense" && bills_enabled ? (
                  <FormField
                    name="bill_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <BillCombobox
                            {...field}
                            walletId={walletId}
                            size="sm"
                            placeholder="Bill"
                            className="w-auto max-w-52 rounded-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ) : null}
                {ontology_associations_enabled && activeWorkspace ? (
                  <FormField
                    name="ontologyAssociations"
                    render={({ field }) => (
                      <FormItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2 rounded-full"
                            >
                              <Network className="size-4" />
                              {field.value?.length
                                ? `Context · ${field.value.length}`
                                : "Context"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-[min(38rem,calc(100vw-2rem))] p-0"
                          >
                            <TransactionOntologyEditor
                              workspaceId={activeWorkspace.id}
                              value={field.value ?? []}
                              onChange={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {isEdit ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={repeatForm}
                        disabled={isPending}
                        aria-label="Repeat transaction"
                      >
                        <Repeat2 className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deleteForm}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete transaction"
                      >
                        <Trash className="size-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-4">
                  {!isEdit ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="add-another"
                        checked={addAnother}
                        onCheckedChange={setAddAnother}
                      />
                      <label
                        htmlFor="add-another"
                        className="text-muted-foreground text-sm"
                      >
                        Create more
                      </label>
                    </div>
                  ) : null}
                  <SubmitButton
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    isLoading={isPending}
                    className="rounded-full px-5"
                  >
                    {isEdit ? "Update" : `Create ${type}`}
                  </SubmitButton>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseIncomeForm;
