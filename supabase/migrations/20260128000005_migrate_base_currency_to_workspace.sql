-- Migration: Move base_currency from user_preferences to workspaces

-- Step 1: Add base_currency column to workspaces table
ALTER TABLE workspaces ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'MXN';

-- Step 2: Migrate existing base_currency from user_preferences to workspaces
-- For each workspace, copy the base_currency from the owner's user_preferences
DO $$
DECLARE
  workspace_record RECORD;
  owner_user_id UUID;
  owner_base_currency TEXT;
BEGIN
  FOR workspace_record IN SELECT id FROM workspaces LOOP
    -- Get the first owner of this workspace
    SELECT user_id INTO owner_user_id
    FROM workspace_members
    WHERE workspace_id = workspace_record.id
    AND role = 'owner'
    LIMIT 1;

    IF owner_user_id IS NOT NULL THEN
      -- Get the owner's base_currency from user_preferences
      SELECT base_currency INTO owner_base_currency
      FROM user_preferences
      WHERE user_id = owner_user_id;

      -- Update the workspace with the owner's base_currency (if it exists)
      IF owner_base_currency IS NOT NULL THEN
        UPDATE workspaces
        SET base_currency = owner_base_currency
        WHERE id = workspace_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 3: Remove base_currency column from user_preferences
ALTER TABLE user_preferences DROP COLUMN IF EXISTS base_currency;
