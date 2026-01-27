-- Add JSONB column for feature flags
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{"bills_enabled": true}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_feature_flags
ON user_preferences USING GIN (feature_flags);

-- Backfill existing users with default feature flags
UPDATE public.user_preferences
SET feature_flags = '{"bills_enabled": true}'::jsonb
WHERE feature_flags IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE public.user_preferences
ALTER COLUMN feature_flags SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.feature_flags IS
'Feature flags for user-specific feature toggles. Current flags: bills_enabled (boolean)';
