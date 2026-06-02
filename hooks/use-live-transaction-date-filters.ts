import { useMemo } from "react";

import { useTransactionQueryState } from "@/hooks/use-transaction-query";

export function useLiveTransactionDateFilters() {
  const [queryFilters] = useTransactionQueryState();

  return useMemo(
    () => ({
      from: queryFilters.from || undefined,
      to: queryFilters.to || undefined,
    }),
    [queryFilters.from, queryFilters.to],
  );
}
