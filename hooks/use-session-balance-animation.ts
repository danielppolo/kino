"use client";

import { useEffect, useRef, useState } from "react";

import { useIsRestoring, useQuery } from "@tanstack/react-query";

import { useWorkspace } from "@/contexts/workspace-context";
import {
  hasSidebarBalanceRevealed,
  markSidebarBalanceRevealed,
  readSidebarBalance,
  writeSidebarBalance,
} from "@/utils/sidebar-balance-snapshot";
import { createClient } from "@/utils/supabase/client";
import { listWallets } from "@/utils/supabase/queries";
import { Wallet } from "@/utils/supabase/types";

function useWalletsSettleReady(workspaceId: string | undefined) {
  const isRestoring = useIsRestoring();

  const { data, fetchStatus, isFetchedAfterMount } = useQuery<Wallet[]>({
    queryKey: ["wallets", workspaceId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listWallets(supabase, workspaceId!);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 10,
  });

  const [allowFreshCache, setAllowFreshCache] = useState(false);

  useEffect(() => {
    if (isRestoring) {
      setAllowFreshCache(false);
      return;
    }
    if (fetchStatus !== "idle" || data === undefined || isFetchedAfterMount) {
      return;
    }

    // Persisted/fresh cache with no refetch — wait briefly so a pending refetch can start.
    const timeoutId = window.setTimeout(() => {
      setAllowFreshCache(true);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [data, fetchStatus, isFetchedAfterMount, isRestoring]);

  return (
    !isRestoring &&
    data !== undefined &&
    fetchStatus === "idle" &&
    (isFetchedAfterMount || allowFreshCache)
  );
}

/**
 * Shows the locally cached balance first, then animates to the live value when
 * settled data differs. After the initial reveal, later live changes (e.g. from
 * new transactions) keep animating. Remounts reuse the revealed session state so
 * page transitions do not replay the cache → live transition.
 */
export function useSessionBalanceAnimation(
  key: string,
  liveCents: number,
  externalReady = true,
) {
  const { activeWorkspace } = useWorkspace();
  const walletsReady = useWalletsSettleReady(activeWorkspace?.id);
  const ready = walletsReady && externalReady;

  const baselineRef = useRef<{ key: string; value: number | undefined }>({
    key,
    value: readSidebarBalance(key),
  });
  if (baselineRef.current.key !== key) {
    baselineRef.current = { key, value: readSidebarBalance(key) };
  }

  const revealedRef = useRef<{ key: string; value: boolean }>({
    key,
    value: hasSidebarBalanceRevealed(key),
  });
  if (revealedRef.current.key !== key) {
    revealedRef.current = { key, value: hasSidebarBalanceRevealed(key) };
  }

  const [displayCents, setDisplayCents] = useState(() =>
    hasSidebarBalanceRevealed(key)
      ? liveCents
      : (readSidebarBalance(key) ?? liveCents),
  );
  // Once revealed, keep NumberFlow animations on so transaction updates animate.
  const [animated, setAnimated] = useState(() =>
    hasSidebarBalanceRevealed(key),
  );

  useEffect(() => {
    if (revealedRef.current.value || hasSidebarBalanceRevealed(key)) {
      revealedRef.current = { key, value: true };
      markSidebarBalanceRevealed(key);
      setAnimated(true);
      setDisplayCents(liveCents);
      writeSidebarBalance(key, liveCents);
      return;
    }

    if (!ready) {
      setAnimated(false);
      setDisplayCents(baselineRef.current.value ?? liveCents);
      return;
    }

    const baseline = baselineRef.current.value;

    // Lock this key for the JS session so remounts don't replay cache → live.
    markSidebarBalanceRevealed(key);
    revealedRef.current = { key, value: true };
    setAnimated(true);

    if (baseline === undefined || baseline === liveCents) {
      setDisplayCents(liveCents);
      writeSidebarBalance(key, liveCents);
      return;
    }

    // Ensure NumberFlow sees the cached value before the live target.
    setDisplayCents(baseline);

    const frame = requestAnimationFrame(() => {
      setDisplayCents(liveCents);
      writeSidebarBalance(key, liveCents);
    });

    return () => cancelAnimationFrame(frame);
  }, [key, liveCents, ready]);

  const onAnimationsFinish = () => {
    writeSidebarBalance(key, liveCents);
  };

  return {
    displayCents,
    animated,
    onAnimationsFinish,
  };
}
