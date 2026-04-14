"use client";

import { useMemo, useState } from "react";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import {
  createAppQueryClient,
  getAuthenticatedQueryCacheBuster,
  getAuthenticatedQueryCacheKey,
  shouldDehydrateAuthenticatedQuery,
} from "@/utils/query-cache";

interface AuthenticatedProvidersProps {
  children: React.ReactNode;
  userId: string;
}

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export default function AuthenticatedProviders({
  children,
  userId,
}: AuthenticatedProvidersProps) {
  const [queryClient] = useState(() => createAppQueryClient());

  const persister = useMemo(
    () =>
      createSyncStoragePersister({
        key: getAuthenticatedQueryCacheKey(userId),
        throttleTime: 1000,
        serialize: JSON.stringify,
        deserialize: JSON.parse,
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      }),
    [userId],
  );

  const persistOptions = useMemo(
    () => ({
      buster: getAuthenticatedQueryCacheBuster(userId),
      dehydrateOptions: {
        shouldDehydrateQuery: shouldDehydrateAuthenticatedQuery,
      },
      maxAge: DAY_IN_MS,
      persister,
    }),
    [persister, userId],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
