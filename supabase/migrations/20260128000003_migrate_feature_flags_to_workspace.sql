-- Migration: Move feature_flags from user_preferences to workspaces

-- Step 1: Add feature_flags column to workspaces table
ALTER TABLE workspaces ADD COLUMN feature_flags JSONB;

-- Step 2: Migrate existing feature_flags from user_preferences to workspaces
-- For each workspace, copy the feature_flags from the owner's user_preferences
DO $$
DECLARE
  workspace_record RECORD;
  owner_user_id UUID;
  owner_feature_flags JSONB;
BEGIN
  FOR workspace_record IN SELECT id FROM workspaces LOOP
    -- Get the first owner of this workspace
    SELECT user_id INTO owner_user_id
    FROM workspace_members
    WHERE workspace_id = workspace_record.id
    AND role = 'owner'
    LIMIT 1;

    IF owner_user_id IS NOT NULL THEN
      -- Get the owner's feature_flags from user_preferences
      SELECT feature_flags INTO owner_feature_flags
      FROM user_preferences
      WHERE user_id = owner_user_id;

      -- Update the workspace with the owner's feature_flags
      IF owner_feature_flags IS NOT NULL THEN
        UPDATE workspaces
        SET feature_flags = owner_feature_flags
        WHERE id = workspace_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 3: Remove feature_flags column from user_preferences
ALTER TABLE user_preferences DROP COLUMN IF EXISTS feature_flags;
