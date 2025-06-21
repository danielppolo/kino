import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { PAGE_SIZE } from "@/utils/constants";

type Filters = {
  wallet_id: string;
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  sortOrder: string;
};

function useFilters(): Filters {
  const params = useParams();
  const searchParams = useSearchParams();
  const filters = useMemo(() => {
    return {
      wallet_id: params.walletId as string,
      page: Number(searchParams.get("page")) || 0,
      pageSize: Number(searchParams.get("pageSize")) || PAGE_SIZE,
      search: searchParams.get("search") || "",
      sort: searchParams.get("sort") || "",
      sortOrder: searchParams.get("sortOrder") || "",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
    };
  }, [params.walletId, searchParams]);
  return filters;
}

export default useFilters;
