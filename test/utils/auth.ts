import { vi } from "vitest";

export type MockUser = {
  id: string;
  [key: string]: unknown;
};

export function createAuthenticatedSupabaseClient(
  user: MockUser = { id: "user-1" },
) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user },
        error: null,
      })),
    },
  };
}

export function createUnauthenticatedSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: null },
        error: null,
      })),
    },
  };
}
