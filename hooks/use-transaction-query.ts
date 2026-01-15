import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import { PAGE_SIZE } from "@/utils/constants";

export const transactionQueryState = {
  page: parseAsInteger.withDefault(0),
  pageSize: parseAsInteger.withDefault(PAGE_SIZE),
  search: parseAsString.withDefault(""),
  sort: parseAsString.withDefault(""),
  sortOrder: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  label_id: parseAsString.withDefault(""),
  category_id: parseAsString.withDefault(""),
  transfer_id: parseAsString.withDefault(""),
  tag: parseAsString.withDefault(""),
  type: parseAsString.withDefault(""),
  description: parseAsString.withDefault(""),
  id: parseAsString.withDefault(""),
};

export function useTransactionQueryState() {
  return useQueryStates(transactionQueryState);
}
