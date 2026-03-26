import { z } from "zod";

export const FinanceMemoryProfileSchema = z.object({
  country_of_residence: z.string().nullable(),
  tax_region: z.string().nullable(),
  preferred_language: z.string().nullable(),
  markets_accessible: z.array(z.string()),
  brokerage_platforms: z.array(z.string()),
  account_types: z.array(z.string()),
  instruments_accessible: z.array(z.string()),
  base_planning_currency: z.string().nullable(),
  risk_tolerance: z.string().nullable(),
  investment_goals: z.array(z.string()),
  liquidity_needs: z.string().nullable(),
  time_horizon: z.string().nullable(),
  constraints: z.array(z.string()),
  known_limitations: z.array(z.string()),
  preferred_explanation_style: z.string().nullable(),
  rebalancing_frequency: z.string().nullable(),
  dividend_vs_growth_preference: z.string().nullable(),
  tax_sensitivity_preference: z.string().nullable(),
  fee_style_preference: z.string().nullable(),
});

export const FinanceMemoryDerivedContextSchema = z.object({
  currencies_held: z.array(z.string()),
  wallet_types: z.array(z.string()),
  observed_asset_exposure_summary: z.array(
    z.object({
      label: z.string(),
      detail: z.string(),
    }),
  ),
  observed_instrument_patterns: z.array(z.string()),
  observed_country_market_bias: z.array(z.string()),
  cash_vs_invested_bias: z.string().nullable(),
  income_stability_signals: z.array(z.string()),
  liquidity_pressure_signals: z.array(z.string()),
  recent_behavioral_notes: z.array(z.string()),
  last_derived_at: z.string().nullable(),
});

export const FinanceMemorySchema = z.object({
  profile: FinanceMemoryProfileSchema,
  derived_context: FinanceMemoryDerivedContextSchema,
  provenance: z.object({
    profile: z.literal("user_declared"),
    derived_context: z.literal("system_derived"),
  }),
  profile_updated_at: z.string().nullable(),
  derived_updated_at: z.string().nullable(),
});

export type FinanceMemoryProfile = z.infer<typeof FinanceMemoryProfileSchema>;
export type FinanceMemoryDerivedContext = z.infer<
  typeof FinanceMemoryDerivedContextSchema
>;
export type FinanceMemory = z.infer<typeof FinanceMemorySchema>;

export function createEmptyFinanceMemory(): FinanceMemory {
  return {
    profile: {
      country_of_residence: null,
      tax_region: null,
      preferred_language: null,
      markets_accessible: [],
      brokerage_platforms: [],
      account_types: [],
      instruments_accessible: [],
      base_planning_currency: null,
      risk_tolerance: null,
      investment_goals: [],
      liquidity_needs: null,
      time_horizon: null,
      constraints: [],
      known_limitations: [],
      preferred_explanation_style: null,
      rebalancing_frequency: null,
      dividend_vs_growth_preference: null,
      tax_sensitivity_preference: null,
      fee_style_preference: null,
    },
    derived_context: {
      currencies_held: [],
      wallet_types: [],
      observed_asset_exposure_summary: [],
      observed_instrument_patterns: [],
      observed_country_market_bias: [],
      cash_vs_invested_bias: null,
      income_stability_signals: [],
      liquidity_pressure_signals: [],
      recent_behavioral_notes: [],
      last_derived_at: null,
    },
    provenance: {
      profile: "user_declared",
      derived_context: "system_derived",
    },
    profile_updated_at: null,
    derived_updated_at: null,
  };
}

export function parseFinanceMemory(value: unknown): FinanceMemory {
  const parsed = FinanceMemorySchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  return createEmptyFinanceMemory();
}

export function normalizeStringList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatStringList(value: string[]) {
  return value.join("\n");
}
