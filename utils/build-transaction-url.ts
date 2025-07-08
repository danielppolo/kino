import { ReadonlyURLSearchParams } from "next/navigation";

export interface BuildTransactionUrlOptions {
  walletId?: string;
  labelId?: string;
  from?: string;
  to?: string;
  searchParams?: ReadonlyURLSearchParams | string;
  pathname?: string;
}

export function buildTransactionUrl({
  walletId,
  labelId,
  from,
  to,
  searchParams,
  pathname,
}: BuildTransactionUrlOptions): string {
  // Parse existing search params
  const params = new URLSearchParams();

  if (searchParams) {
    const existingParams =
      typeof searchParams === "string"
        ? new URLSearchParams(searchParams)
        : searchParams;

    // Copy all existing params
    existingParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  // Override with provided values
  if (labelId) {
    params.set("label_id", labelId);
  }
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }

  const queryString = params.toString();
  const baseUrl = pathname?.includes("infographics")
    ? walletId
      ? `/app/infographics/${walletId}`
      : "/app/infographics"
    : walletId
      ? `/app/transactions/${walletId}`
      : "/app/transactions";

  return baseUrl;
}
