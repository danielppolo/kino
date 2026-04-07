/**
 * Centralized feature flag definitions
 */
export interface FeatureFlags {
  bills_enabled: boolean;
  infographics_autonomy_enabled: boolean;
  fire_enabled: boolean;
  // Future flags:
  // analytics_enabled?: boolean;
  // ai_insights_enabled?: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  bills_enabled: true,
  infographics_autonomy_enabled: true,
  fire_enabled: true,
};

/**
 * Type guard to ensure feature flags object is valid
 */
export function isValidFeatureFlags(flags: unknown): flags is FeatureFlags {
  if (typeof flags !== 'object' || flags === null) return false;
  const f = flags as Record<string, unknown>;
  return typeof f.bills_enabled === 'boolean';
}

/**
 * Safely parse feature flags from database JSON.
 * Merges with defaults so newly-added flags are enabled even for existing workspaces.
 */
export function parseFeatureFlags(json: unknown): FeatureFlags {
  if (isValidFeatureFlags(json)) {
    return { ...DEFAULT_FEATURE_FLAGS, ...json };
  }
  return { ...DEFAULT_FEATURE_FLAGS };
}
