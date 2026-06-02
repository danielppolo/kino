import { vi } from "vitest";

export type SupabaseMockResponse<TData = unknown> = {
  data: TData | null;
  error: Error | null;
  count?: number | null;
};

export type SupabaseMockCall = {
  table: string;
  method:
    | "from"
    | "select"
    | "insert"
    | "update"
    | "upsert"
    | "delete"
    | "eq"
    | "in"
    | "gte"
    | "lte"
    | "order"
    | "range"
    | "single"
    | "maybeSingle"
    | "execute";
  args: unknown[];
};

type TableResponses = Record<string, SupabaseMockResponse[]>;

type SupabaseMockQuery = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: <TResult1 = SupabaseMockResponse, TResult2 = never>(
    onFulfilled?:
      | ((response: SupabaseMockResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

const defaultResponse = (): SupabaseMockResponse => ({
  data: null,
  error: null,
});

export function createSupabaseMock(initialResponses: TableResponses = {}) {
  const responses = new Map<string, SupabaseMockResponse[]>(
    Object.entries(initialResponses).map(([table, tableResponses]) => [
      table,
      [...tableResponses],
    ]),
  );
  const calls: SupabaseMockCall[] = [];

  function queueTableResponse(
    table: string,
    response: SupabaseMockResponse,
  ): void {
    responses.set(table, [...(responses.get(table) ?? []), response]);
  }

  function consumeResponse(table: string): SupabaseMockResponse {
    const tableResponses = responses.get(table) ?? [];
    const response = tableResponses.shift() ?? defaultResponse();
    responses.set(table, tableResponses);
    return response;
  }

  function createQuery(table: string) {
    const query: SupabaseMockQuery = {
      select: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "select", args });
        return query;
      }),
      insert: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "insert", args });
        return query;
      }),
      update: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "update", args });
        return query;
      }),
      upsert: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "upsert", args });
        return query;
      }),
      delete: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "delete", args });
        return query;
      }),
      eq: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "eq", args });
        return query;
      }),
      in: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "in", args });
        return query;
      }),
      gte: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "gte", args });
        return query;
      }),
      lte: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "lte", args });
        return query;
      }),
      order: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "order", args });
        return query;
      }),
      range: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: "range", args });
        return query;
      }),
      single: vi.fn(async () => {
        calls.push({ table, method: "single", args: [] });
        return consumeResponse(table);
      }),
      maybeSingle: vi.fn(async () => {
        calls.push({ table, method: "maybeSingle", args: [] });
        return consumeResponse(table);
      }),
      then: <TResult1 = SupabaseMockResponse, TResult2 = never>(
        onFulfilled?:
          | ((
              response: SupabaseMockResponse,
            ) => TResult1 | PromiseLike<TResult1>)
          | null,
        onRejected?:
          | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
          | null,
      ) => {
        calls.push({ table, method: "execute", args: [] });
        return Promise.resolve(consumeResponse(table)).then(
          onFulfilled ?? undefined,
          onRejected ?? undefined,
        );
      },
    };

    return query;
  }

  const client = {
    from: vi.fn((table: string) => {
      calls.push({ table, method: "from", args: [table] });
      return createQuery(table);
    }),
  };

  return {
    client,
    calls,
    queueTableResponse,
  };
}
