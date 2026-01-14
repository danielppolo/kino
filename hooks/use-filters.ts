import { useMemo } from "react";
import { useParams } from "next/navigation";

import { useTransactionQueryState } from "@/hooks/use-transaction-query";

type Filters = {
  wallet_id: string;
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  sortOrder: string;
  from: string;
  to: string;
  label_id: string;
  category_id: string;
  transfer_id: string;
  tag: string;
  type: string;
  description: string;
  id: string;
};

function useFilters(): Filters {
  const params = useParams();
  const [filters] = useTransactionQueryState();

  return useMemo(
    () => ({
      wallet_id: params.walletId as string,
      ...filters,
    }),
    [filters, params.walletId],
  );
}

export default useFilters;
