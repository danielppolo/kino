const STORAGE_KEY = "kino:sidebar-balance-snapshot";

type Snapshot = Record<string, number>;

const revealedKeys = new Set<string>();

function readAll(): Snapshot {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Snapshot;
  } catch {
    return {};
  }
}

function writeAll(snapshot: Snapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function sidebarBalanceKey(workspaceId: string, id: string) {
  return `${workspaceId}:${id}`;
}

export function readSidebarBalance(key: string): number | undefined {
  const value = readAll()[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function writeSidebarBalance(key: string, cents: number) {
  const snapshot = readAll();
  if (snapshot[key] === cents) return;
  snapshot[key] = cents;
  writeAll(snapshot);
}

export function hasSidebarBalanceRevealed(key: string) {
  return revealedKeys.has(key);
}

export function markSidebarBalanceRevealed(key: string) {
  revealedKeys.add(key);
}
