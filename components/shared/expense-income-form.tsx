"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { v4 as randomUUID } from "uuid";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import BillCombobox from "./bill-combobox";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";

import { createPlaidTransactionRule } from "@/actions/create-plaid-transaction-rule";
import { createTransaction } from "@/actions/create-transaction";
import CategoryCombobox from "@/components/shared/category-combobox";
import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  useFeatureFlags,
  useTags,
  useWallets,
} from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { useWorkspace } from "@/contexts/workspace-context";
import useFilters from "@/hooks/use-filters";
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
  amount: number;
  type: "income" | "expense";
  date: string;
  description?: string;
  category_id: string;
  label_id: string;
  wallet_id: string;
  currency: string;
  tags?: string[];
  bill_id?: string;
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
  const { bills_enabled } = useFeatureFlags();
  const { activeWorkspace } = useWorkspace();
  const filters = useFilters();
  const [availableTags] = useTags();
  const [addAnother, setAddAnother] = useState(false);
  const queryClient = useQueryClient();
  const { billPrefill } = useTransactionForm();
  const workspaceWalletIds = wallets.map((wallet) => wallet.id);
  const transactionsQueryKey = [
    "transactions",
    filters,
    workspaceWalletIds,
  ] as const;

  const { mutateAsync, isPending } = useMutation<
    { data: Transaction[] },
    Error,
    ExpenseIncomeFormValues,
    {
      previousData?: InfiniteTransactionData;
      optimisticTransaction: TransactionList;
    }
  >({
    mutationFn: async (values) => {
      const result = await createTransaction(values);
      if (!result.success)
        throw new Error(result.error ?? "Failed to create transaction");
      return { data: result.data ?? [] };
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

  const learnPlaidRuleMutation = useMutation({
    mutationFn: createPlaidTransactionRule,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Future Plaid imports from ${result.merchantName} will use this category.`,
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to save Plaid category rule: ${error.message}`);
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
    amount: initialData
      ? Math.abs(initialData.amount_cents) / 100
      : billPrefill
        ? billPrefill.amount / 100
        : 0,
    tags: initialData?.tags ?? [],
    bill_id: billPrefill?.billId ?? "",
  };

  const handleSubmit = async (values: ExpenseIncomeFormValues) => {
    try {
      // Check if amount has changed (for edits)
      const isEdit = initialData && values.id;
      const originalAmount = initialData
        ? Math.abs(initialData.amount_cents) / 100
        : 0;
      const amountChanged = isEdit && values.amount !== originalAmount;

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

      const result = await mutateAsync(values);
      const transactionId = result?.data?.[0]?.id ?? values.id;

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

      const shouldOfferPlaidRuleLearning =
        !!initialData?.id &&
        !!initialData.plaid_transaction_id &&
        !!initialData.plaid_merchant_key &&
        values.category_id !== (initialData.category_id ?? "");

      if (shouldOfferPlaidRuleLearning) {
        const merchantName =
          initialData.plaid_merchant_name ??
          initialData.description ??
          "this merchant";

        toast.message("Learn category for future Plaid imports?", {
          action: {
            label: "Save rule",
            onClick: () => {
              learnPlaidRuleMutation.mutate({
                categoryId: values.category_id,
                transactionId: initialData.id!,
              });
            },
          },
          description: `${merchantName} in ${walletMap.get(values.wallet_id)?.name ?? "this wallet"}.`,
        });
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
    amount: Math.abs(transaction.amount_cents) / 100,
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
  });

  const handleRepeat = async (values: ExpenseIncomeFormValues) => {
    const repeatValues: ExpenseIncomeFormValues = {
      ...values,
      id: undefined,
      date: format(Date.now(), "yyyy-MM-dd"),
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

  return (
    <EntityForm
      title={type}
      type={type as "expense" | "income"}
      entity={initialData ? convertToFormValues(initialData) : undefined}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      addAnother={addAnother}
      setAddAnother={setAddAnother}
      isLoading={isPending}
      isDeleting={deleteMutation.isPending}
      onRepeat={initialData ? handleRepeat : undefined}
      isRepeating={isPending}
    >
      <FormField
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <AmountInput {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
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
                  className="w-full"
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormControl>
                <DaterPicker {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="label_id"
          rules={{ required: "Label is required" }}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <LabelCombobox {...field} className="w-full" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <TagMultiSelect
                {...field}
                options={availableTags}
                className="w-full"
              />
            </FormControl>
          </FormItem>
        )}
      />

      {type === "expense" && bills_enabled && (
        <FormField
          name="bill_id"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <BillCombobox
                  {...field}
                  walletId={walletId}
                  className="w-full"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </EntityForm>
  );
};

export default ExpenseIncomeForm;
