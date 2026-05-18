import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import {
  createClient,
  createServiceRoleClient,
} from "@/utils/supabase/server";

vi.mock("@/utils/fetch-conversions-server", () => ({
  fetchAllConversions: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

const mockedFetchAllConversions = vi.mocked(fetchAllConversions);
const mockedCreateClient = vi.mocked(createClient);
const mockedCreateServiceRoleClient = vi.mocked(createServiceRoleClient);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/currency-conversions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("currency conversions route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses a service-role client to cache conversions after authenticating the user", async () => {
    const userSupabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: "user-1" } },
        })),
      },
    };
    const serviceRoleSupabase = { role: "service-role" };

    mockedCreateClient.mockResolvedValue(userSupabase as never);
    mockedCreateServiceRoleClient.mockReturnValue(serviceRoleSupabase as never);
    mockedFetchAllConversions.mockResolvedValue({
      USD: {
        rate: 18.5,
        lastUpdated: "2026-05-17T12:00:00.000Z",
        source: "api",
      },
    });

    const response = await POST(
      createRequest({
        currencies: ["USD"],
        baseCurrency: "MXN",
      }),
    );

    expect(response.status).toBe(200);
    expect(userSupabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mockedFetchAllConversions).toHaveBeenCalledWith({
      currencies: ["USD"],
      baseCurrency: "MXN",
      supabaseClient: serviceRoleSupabase,
    });
    await expect(response.json()).resolves.toEqual({
      conversions: {
        USD: {
          rate: 18.5,
          lastUpdated: "2026-05-17T12:00:00.000Z",
          source: "api",
        },
      },
    });
  });

  it("rejects unauthenticated requests before using the service role", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
        })),
      },
    } as never);

    const response = await POST(
      createRequest({
        currencies: ["USD"],
        baseCurrency: "MXN",
      }),
    );

    expect(response.status).toBe(401);
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockedFetchAllConversions).not.toHaveBeenCalled();
  });
});
