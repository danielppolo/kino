"use client";

import { useState } from "react";
import { format } from "date-fns";
import { v4 as randomUUID } from "uuid";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import BillCombobox from "./bill-combobox";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";

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
import useFilters from "@/hooks/use-filters";
import { createClient } from "@/utils/supabase/client";
import {
  deleteTransaction,
  setTransactionBills,
} from "@/utils/supabase/mutations";
import { getBillsForTransaction } from "@/utils/supabase/queries";
import { Transaction, TransactionList } from "@/utils/supabase/types";

interface TransactionPage {
  data: TransactionList[];
  error: null;
  count: number;
}

interface InfiniteTransactionData {
  pages: TransactionPage[];
  pageParams: number[];
}

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
  const [, walletMap] = useWallets();
  const { bills_enabled } = useFeatureFlags();
  const filters = useFilters();
  const [availableTags] = useTags();
  const [addAnother, setAddAnother] = useState(false);
  const queryClient = useQueryClient();
  const { billPrefill } = useTransactionForm();

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
      if (!result.success) throw new Error(result.error ?? "Failed to create transaction");
      return { data: result.data ?? [] };
    },
    onMutate: async (newTransaction) => {
      await queryClient.cancelQueries({
        queryKey: ["transactions", filters],
      });

      const previousData = queryClient.getQueryData<InfiniteTransactionData>([
        "transactions",
        filters,
      ]);

      const optimisticTransaction: TransactionList = {
        id: randomUUID(),
        wallet_id: newTransaction.wallet_id,
        category_id: newTransaction.category_id || null,
        label_id: newTransaction.label_id || null,
        amount_cents:
          newTransaction.type === "expense"
            ? -Math.round(newTransaction.amount * 100)
            : Math.round(newTransaction.amount * 100),
        currency: newTransaction.currency,
        description: newTransaction.description ?? null,
        date: newTransaction.date,
        type: newTransaction.type,
        tag_ids: newTransaction.tags ?? null,
      };

      queryClient.setQueryData<InfiniteTransactionData>(
        ["transactions", filters],
        (old) => {
          if (!old) {
            return {
              pages: [
                {
                  data: [optimisticTransaction],
                  error: null,
                  count: 1,
                },
              ],
              pageParams: [0],
            };
          }

          return {
            ...old,
            pages: old.pages.map((page, index) =>
              index === 0
                ? { ...page, data: [optimisticTransaction, ...page.data] }
                : page,
            ),
          };
        },
      );

      return { previousData, optimisticTransaction };
    },
    onError: (_err, _newTransaction, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["transactions", filters],
          context.previousData,
        );
      }
    },
    onSuccess: (data, _variables, context) => {
      const saved = data?.data?.[0];
      if (!saved || !context?.optimisticTransaction) return;

      const updatedTransaction: TransactionList = {
        id: saved.id,
        wallet_id: saved.wallet_id,
        category_id: saved.category_id,
        label_id: saved.label_id ?? null,
        amount_cents: saved.amount_cents,
        currency: saved.currency,
        description: saved.description ?? null,
        date: saved.date,
        type: saved.type,
        tag_ids: (saved as { tags?: string[] | null }).tags ?? null,
      };

      queryClient.setQueryData<InfiniteTransactionData>(
        ["transactions", filters],
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
      queryClient.invalidateQueries({
        queryKey: ["transactions", filters],
      });
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
          existingBillIds = billsResult.data
            .map((bp: any) => bp.bill_id)
            .filter(Boolean);
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
    tags: transaction.tag_ids ?? undefined,
    bill_id: "",
  });

  const handleRepeat = async (values: ExpenseIncomeFormValues) => {
    const { id: _id, ...rest } = values;
    const repeatValues: ExpenseIncomeFormValues = {
      ...rest,
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
                <DescriptionInput {...field} />
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
