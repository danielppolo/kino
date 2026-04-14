"use client";

import {
  defaultShouldDehydrateQuery,
  Query,
  QueryClient,
} from "@tanstack/react-query";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const SECOND_IN_MS = 1000;

const AUTHENTICATED_QUERY_CACHE_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  "v1";

export const AUTHENTICATED_QUERY_CACHE_PREFIX = "kino-react-query-cache";

const PERSISTED_QUERY_ROOTS = new Set([
  "transactions",
  "wallets",
  "workspace-wallets",
  "wallet-owed-amounts",
  "cashflow-breakdown",
  "bills",
  "bills-with-payments",
  "recurrent-bills",
  "recurring-transactions",
  "unassociated-transactions",
  "income-transactions",
  "categories",
  "category-transaction-counts",
  "labels",
  "tags",
  "tag-transaction-counts",
  "views",
  "transaction-templates",
  "real-estate-assets",
  "real-estate-asset-valuations",
  "workspace-members",
  "wallet-members",
  "workspace-currency-conversions",
  "workspaces",
  "user-preferences",
  "category-pie-chart",
  "label-pie-chart",
  "category-trends",
  "label-area-chart",
  "label-trends",
  "expense-concentration",
  "forecast-line-chart-balances",
  "freedom-multiplier-stats",
  "wallet-net-balance",
  "transaction-type-distribution",
  "autonomy-horizon-balances",
  "expense-predictability",
  "bills-vs-discretionary",
  "transfer-flow-diagram",
  "burn-rate-drift-stats",
  "burn-rate-drift-recurring",
  "accumulated-area-chart",
  "avg-spending-vs-income",
  "currency-exposure",
  "bill-payment-rate",
  "bill-burden-ratio",
  "bill-balance-line-chart",
  "bill-debt-flow",
  "transaction-size-distribution",
  "sufficiency-ratio-balances",
  "sufficiency-ratio-stats",
  "cash-flow-after-bills",
  "bills-history-chart",
  "recurring-vs-onetime-bills",
  "bill-coverage-ratio",
  "bill-payment-timeline",
  "chart-controls-stats",
  "bill-velocity",
  "workspace-members-with-emails",
]);

const WORKSPACE_INVALIDATION_ROOTS: ReadonlyArray<readonly [string]> = [
  ["transactions"],
  ["cashflow-breakdown"],
  ["wallet-owed-amounts"],
  ["bills"],
  ["bills-with-payments"],
  ["recurrent-bills"],
  ["recurring-transactions"],
  ["unassociated-transactions"],
  ["income-transactions"],
  ["categories"],
  ["category-transaction-counts"],
  ["labels"],
  ["tags"],
  ["tag-transaction-counts"],
  ["views"],
  ["transaction-templates"],
  ["wallets"],
  ["real-estate-assets"],
  ["real-estate-asset-valuations"],
  ["workspace-wallets"],
  ["workspace-members"],
  ["wallet-members"],
  ["workspace-currency-conversions"],
  ["workspaces"],
  ["user-preferences"],
  ["category-pie-chart"],
  ["label-pie-chart"],
  ["category-trends"],
  ["label-area-chart"],
  ["label-trends"],
  ["expense-concentration"],
];

export const createAppQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: DAY_IN_MS,
        staleTime: 15 * SECOND_IN_MS,
        refetchOnMount: true,
        refetchOnReconnect: true,
      },
    },
  });

export const getAuthenticatedQueryCacheKey = (userId: string) =>
  `${AUTHENTICATED_QUERY_CACHE_PREFIX}:${AUTHENTICATED_QUERY_CACHE_VERSION}:${userId}`;

export const getAuthenticatedQueryCacheBuster = (userId: string) =>
  `${AUTHENTICATED_QUERY_CACHE_VERSION}:${userId}`;

export const shouldDehydrateAuthenticatedQuery = (query: Query) => {
  if (!defaultShouldDehydrateQuery(query)) {
    return false;
  }

  if (query.meta?.persist === false) {
    return false;
  }

  const [rootKey] = query.queryKey;
  if (typeof rootKey !== "string") {
    return false;
  }

  if (!PERSISTED_QUERY_ROOTS.has(rootKey)) {
    return false;
  }

  return query.state.data !== undefined;
};

export const hasPersistedQueryData = () => {
  if (typeof window === "undefined") return false;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(`${AUTHENTICATED_QUERY_CACHE_PREFIX}:`)) {
      return true;
    }
  }

  return false;
};

export const clearPersistedQueryCaches = () => {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(`${AUTHENTICATED_QUERY_CACHE_PREFIX}:`)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
};

export const invalidateWorkspaceQueries = async (queryClient: QueryClient) => {
  await Promise.all(
    WORKSPACE_INVALIDATION_ROOTS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
};
