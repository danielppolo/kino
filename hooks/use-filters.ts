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
  review_status: string;
};

function useFilters(): Filters {
  const params = useParams();
  const [filters] = useTransactionQueryState();

  return {
    wallet_id: params.walletId as string,
    ...filters,
  };
}

export default useFilters;
