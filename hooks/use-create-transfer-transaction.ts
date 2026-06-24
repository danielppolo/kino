"use client";

import { useMemo } from "react";
import { v4 as randomUUID } from "uuid";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTransferTransaction } from "@/actions/create-transfer";
import { useWallets } from "@/contexts/settings-context";
import useFilters from "@/hooks/use-filters";
import {
  applyOptimisticTransaction,
  type InfiniteTransactionData,
} from "@/utils/optimistic-transactions";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import type { Database } from "@/utils/supabase/database.types";
import type { Transaction, TransactionList } from "@/utils/supabase/types";

export type TransferTransactionValues = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "amount_cents" | "wallet_id"
> & {
  sender_wallet_id: string;
  receiver_wallet_id: string;
  amount: number;
};

type CreateTransferResult = Awaited<
  ReturnType<typeof createTransferTransaction>
>;

type OptimisticTransferContext = {
  previousData?: InfiniteTransactionData;
  optimisticSourceId: string;
  optimisticDestinationId: string;
};

const transferCategoryId =
  process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID ?? null;

const toNullable = <T>(value: T | null | undefined | "") =>
  value === "" || value === undefined ? null : value;

const transactionMatchesFilters = (
  transaction: TransactionList,
  filters: ReturnType<typeof useFilters>,
) => {
  if (filters.wallet_id && transaction.wallet_id !== filters.wallet_id) {
    return false;
  }
  if (filters.type && transaction.type !== filters.type) {
    return false;
  }
  if (filters.category_id && transaction.category_id !== filters.category_id) {
    return false;
  }
  if (filters.label_id && transaction.label_id !== filters.label_id) {
    return false;
  }
  if (filters.transfer_id && transaction.transfer_id !== filters.transfer_id) {
    return false;
  }
  if (filters.from && (transaction.date ?? "") < filters.from) {
    return false;
  }
  if (filters.to && (transaction.date ?? "") > filters.to) {
    return false;
  }
  if (
    filters.search &&
    !transaction.description
      ?.toLowerCase()
      .includes(filters.search.toLowerCase())
  ) {
    return false;
  }
  return true;
};

const transactionRowFromValues = ({
  values,
  id,
  walletId,
  transferWalletId,
  amountCents,
}: {
  values: TransferTransactionValues;
  id: string;
  walletId: string;
  transferWalletId: string;
  amountCents: number;
}): TransactionList => ({
  id,
  wallet_id: walletId,
  category_id: transferCategoryId,
  label_id: toNullable(values.label_id),
  amount_cents: amountCents,
  base_amount_cents: null,
  created_at: null,
  currency: values.currency ?? null,
  date: values.date ?? null,
  description: toNullable(values.description),
  needs_review: !transferCategoryId || !toNullable(values.label_id),
  note: null,
  plaid_merchant_key: null,
  plaid_merchant_name: null,
  plaid_pending_transaction_id: null,
  plaid_personal_finance_category_primary: null,
  plaid_transaction_id: null,
  tag_ids: null,
  tags: null,
  transfer_id: "pending",
  transfer_wallet_id: transferWalletId,
  type: "transfer",
});

const transactionRowFromSaved = ({
  transaction,
  transferWalletId,
}: {
  transaction: Transaction;
  transferWalletId: string;
}): TransactionList => ({
  id: transaction.id,
  wallet_id: transaction.wallet_id,
  category_id: transaction.category_id,
  label_id: transaction.label_id ?? null,
  amount_cents: transaction.amount_cents,
  base_amount_cents: transaction.base_amount_cents ?? null,
  created_at: transaction.created_at ?? null,
  currency: transaction.currency,
  date: transaction.date,
  description: transaction.description ?? null,
  needs_review: !transaction.category_id || !transaction.label_id,
  note: transaction.note ?? null,
  plaid_merchant_key: transaction.plaid_merchant_key ?? null,
  plaid_merchant_name: transaction.plaid_merchant_name ?? null,
  plaid_pending_transaction_id:
    transaction.plaid_pending_transaction_id ?? null,
  plaid_personal_finance_category_primary:
    transaction.plaid_personal_finance_category_primary ?? null,
  plaid_transaction_id: transaction.plaid_transaction_id ?? null,
  tag_ids: null,
  tags: null,
  transfer_id: transaction.transfer_id ?? null,
  transfer_wallet_id: transferWalletId,
  type: transaction.type,
});

export function useCreateTransferTransaction() {
  const queryClient = useQueryClient();
  const [wallets] = useWallets();
  const filters = useFilters();
  const workspaceWalletIds = useMemo(
    () => wallets.map((wallet) => wallet.id),
    [wallets],
  );
  const transactionsQueryKey = useMemo(
    () => ["transactions", filters, workspaceWalletIds] as const,
    [filters, workspaceWalletIds],
  );

  return useMutation<
    CreateTransferResult,
    Error,
    TransferTransactionValues,
    OptimisticTransferContext
  >({
    mutationFn: async (values) => {
      const { sender_wallet_id, receiver_wallet_id, ...transaction } = values;
      const result = await createTransferTransaction(
        { ...transaction },
        sender_wallet_id,
        receiver_wallet_id,
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: transactionsQueryKey });

      const previousData =
        queryClient.getQueryData<InfiniteTransactionData>(transactionsQueryKey);
      const normalizedAmount = Math.abs(values.amount);
      const amountCents = Math.round(normalizedAmount * 100);
      const optimisticSourceId = randomUUID();
      const optimisticDestinationId = randomUUID();
      const optimisticSource = transactionRowFromValues({
        values,
        id: optimisticSourceId,
        walletId: values.sender_wallet_id,
        transferWalletId: values.receiver_wallet_id,
        amountCents: -amountCents,
      });
      const optimisticDestination = transactionRowFromValues({
        values,
        id: optimisticDestinationId,
        walletId: values.receiver_wallet_id,
        transferWalletId: values.sender_wallet_id,
        amountCents,
      });

      queryClient.setQueryData<InfiniteTransactionData>(
        transactionsQueryKey,
        (old) => {
          let next = old;
          if (transactionMatchesFilters(optimisticDestination, filters)) {
            next = applyOptimisticTransaction(next, optimisticDestination);
          }
          if (transactionMatchesFilters(optimisticSource, filters)) {
            next = applyOptimisticTransaction(next, optimisticSource);
          }
          return next;
        },
      );

      return {
        previousData,
        optimisticSourceId,
        optimisticDestinationId,
      };
    },
    onError: (_error, _values, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(transactionsQueryKey, context.previousData);
      }
    },
    onSuccess: (result, values, context) => {
      if (!result.data || !context) return;

      const sourceTransaction = transactionRowFromSaved({
        transaction: result.data.sourceTransaction as Transaction,
        transferWalletId: values.receiver_wallet_id,
      });
      const destinationTransaction = transactionRowFromSaved({
        transaction: result.data.destinationTransaction as Transaction,
        transferWalletId: values.sender_wallet_id,
      });

      queryClient.setQueryData<InfiniteTransactionData>(
        transactionsQueryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((transaction) => {
                if (transaction.id === context.optimisticSourceId) {
                  return sourceTransaction;
                }
                if (transaction.id === context.optimisticDestinationId) {
                  return destinationTransaction;
                }
                return transaction;
              }),
            })),
          };
        },
      );
    },
    onSettled: () => {
      void invalidateWorkspaceQueries(queryClient);
    },
  });
}
