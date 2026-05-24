import type { TransactionList } from "@/utils/supabase/types";

export interface TransactionPage {
  data: TransactionList[];
  error: null;
  count: number;
}

export interface InfiniteTransactionData {
  pages: TransactionPage[];
  pageParams: number[];
}

export function findTransactionById(
  data: InfiniteTransactionData | undefined,
  transactionId: string | undefined,
) {
  if (!data || !transactionId) return undefined;

  for (const page of data.pages) {
    const transaction = page.data.find((item) => item.id === transactionId);
    if (transaction) return transaction;
  }

  return undefined;
}

export function applyOptimisticTransaction(
  data: InfiniteTransactionData | undefined,
  optimisticTransaction: TransactionList,
  transactionId?: string,
): InfiniteTransactionData {
  if (!data) {
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

  if (transactionId) {
    let didReplace = false;
    const pages = data.pages.map((page) => ({
      ...page,
      data: page.data.map((transaction) => {
        if (transaction.id !== transactionId) return transaction;
        didReplace = true;
        return optimisticTransaction;
      }),
    }));

    if (didReplace) {
      return { ...data, pages };
    }
  }

  return {
    ...data,
    pages: data.pages.map((page, index) =>
      index === 0
        ? { ...page, data: [optimisticTransaction, ...page.data] }
        : page,
    ),
  };
}
