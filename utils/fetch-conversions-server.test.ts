import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAllConversions,
  fetchConversion,
} from "@/utils/fetch-conversions-server";

type CachedRate = {
  rate: number;
  updated_at: string;
};

type CacheResult = {
  data: CachedRate | null;
  error: Error | null;
};

type QueryMock = {
  eq: ReturnType<typeof vi.fn<(column: string, value: string) => QueryMock>>;
  maybeSingle: ReturnType<typeof vi.fn<() => Promise<CacheResult>>>;
};

type CurrencyApiResponse = {
  ok: boolean;
  json: () => Promise<{
    data: {
      MXN: {
        value: number;
      };
    };
  }>;
};

type FetchMock = (input: string | URL) => Promise<CurrencyApiResponse>;

function createSupabaseMock({
  cachedRate = null,
  cacheError = null,
  upsertError = null,
}: {
  cachedRate?: CachedRate | null;
  cacheError?: Error | null;
  upsertError?: Error | null;
} = {}) {
  const filters: Array<[string, string]> = [];
  const upserts: Array<{
    row: Record<string, unknown>;
    options: Record<string, unknown>;
  }> = [];

  const query = {} as QueryMock;
  query.eq = vi.fn((column: string, value: string) => {
    filters.push([column, value]);
    return query;
  });
  query.maybeSingle = vi.fn(async () => ({
    data: cachedRate,
    error: cacheError,
  }));

  const table = {
    select: vi.fn(() => query),
    upsert: vi.fn(
      async (
        row: Record<string, unknown>,
        options: Record<string, unknown>,
      ) => {
        upserts.push({ row, options });
        return { error: upsertError };
      },
    ),
  };

  const client = {
    from: vi.fn(() => table),
  };

  return { client, filters, query, table, upserts };
}

function mockCurrencyApi(rate: number) {
  const fetchMock = vi.fn<FetchMock>(async () => ({
    ok: true,
    json: async () => ({
      data: {
        MXN: {
          value: rate,
        },
      },
    }),
  }));

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("fetchConversion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));
    process.env.CURRENCY_API_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.CURRENCY_API_TOKEN;
  });

  it("uses an exact cached historical rate without checking updated_at freshness", async () => {
    const supabase = createSupabaseMock({
      cachedRate: {
        rate: 17.25,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const conversion = await fetchConversion({
      sourceCurrency: "MXN",
      targetCurrency: "USD",
      date: "2026-04-01",
      supabaseClient: supabase.client as never,
    });

    expect(conversion).toEqual({
      rate: 17.25,
      lastUpdated: "2026-01-01T00:00:00.000Z",
      source: "cache",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(supabase.filters).toEqual([
      ["source_currency", "USD"],
      ["target_currency", "MXN"],
      ["date", "2026-04-01"],
    ]);
  });

  it("uses an exact cached rate for today even when updated_at is older than 24 hours", async () => {
    const supabase = createSupabaseMock({
      cachedRate: {
        rate: 18.5,
        updated_at: "2026-05-15T00:00:00.000Z",
      },
    });

    const conversion = await fetchConversion({
      sourceCurrency: "MXN",
      targetCurrency: "USD",
      date: "2026-05-17",
      supabaseClient: supabase.client as never,
    });

    expect(conversion.source).toBe("cache");
    expect(conversion.rate).toBe(18.5);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches and stores a historical rate when no exact cached row exists", async () => {
    const supabase = createSupabaseMock();
    const fetchMock = mockCurrencyApi(19.1);

    const conversion = await fetchConversion({
      sourceCurrency: "MXN",
      targetCurrency: "USD",
      date: "2026-04-01",
      supabaseClient: supabase.client as never,
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.pathname).toBe("/v3/historical");
    expect(requestedUrl.searchParams.get("date")).toBe("2026-04-01");
    expect(requestedUrl.searchParams.get("base_currency")).toBe("USD");
    expect(requestedUrl.searchParams.get("currencies")).toBe("MXN");
    expect(conversion.source).toBe("api");
    expect(conversion.rate).toBe(19.1);
    expect(supabase.upserts[0]).toEqual({
      row: {
        source_currency: "USD",
        target_currency: "MXN",
        rate: 19.1,
        updated_at: "2026-05-17T12:00:00.000Z",
        date: "2026-04-01",
      },
      options: {
        onConflict: "source_currency,target_currency,date",
      },
    });
  });

  it("fetches and stores today's latest rate when no exact cached row exists for today", async () => {
    const supabase = createSupabaseMock();
    const fetchMock = mockCurrencyApi(20.2);

    const conversion = await fetchConversion({
      sourceCurrency: "MXN",
      targetCurrency: "USD",
      supabaseClient: supabase.client as never,
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.pathname).toBe("/v3/latest");
    expect(requestedUrl.searchParams.get("date")).toBeNull();
    expect(conversion.source).toBe("api");
    expect(conversion.rate).toBe(20.2);
    expect(supabase.filters).toContainEqual(["date", "2026-05-17"]);
    expect(supabase.upserts[0].row.date).toBe("2026-05-17");
  });

  it("returns a direct conversion without Supabase or external API calls for matching currencies", async () => {
    const supabase = createSupabaseMock();

    const conversion = await fetchConversion({
      sourceCurrency: "MXN",
      targetCurrency: "MXN",
      supabaseClient: supabase.client as never,
    });

    expect(conversion).toEqual({
      rate: 1,
      lastUpdated: "2026-05-17T12:00:00.000Z",
      source: "direct",
    });
    expect(supabase.client.from).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("fetchAllConversions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));
    process.env.CURRENCY_API_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.CURRENCY_API_TOKEN;
  });

  it("skips fetching the base currency and includes it as a direct conversion", async () => {
    const supabase = createSupabaseMock();
    const fetchMock = mockCurrencyApi(18.75);

    const conversions = await fetchAllConversions({
      currencies: ["USD", "MXN"],
      baseCurrency: "MXN",
      date: "2026-04-01",
      supabaseClient: supabase.client as never,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(conversions.MXN).toEqual({
      rate: 1,
      lastUpdated: "2026-05-17T12:00:00.000Z",
      source: "direct",
    });
    expect(conversions.USD).toMatchObject({
      rate: 18.75,
      source: "api",
    });
  });
});
