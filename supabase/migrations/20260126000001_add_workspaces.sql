-- Migration: Add workspaces for multi-tenancy
-- This migration transforms Kino from user-scoped to workspace-scoped multi-tenancy

-- ============================================================================
-- STEP 1: Create new tables
-- ============================================================================

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create workspace_members table (junction table for workspace membership)
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'reader')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

-- Create indexes for workspace_members
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- Add trigger for workspace updated_at
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Add workspace_id columns to existing tables (nullable initially)
-- ============================================================================

ALTER TABLE wallets ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE labels ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE tags ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE views ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE transaction_templates ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add active_workspace_id to user_preferences
ALTER TABLE user_preferences ADD COLUMN active_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Data migration - Create workspaces and migrate data
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  v_workspace_id UUID;
  wallet_record RECORD;
BEGIN
  -- For each user in the system
  FOR user_record IN SELECT DISTINCT id FROM auth.users LOOP
    -- Create a "Personal" workspace for this user
    INSERT INTO workspaces (name, created_at, updated_at)
    VALUES ('Personal', NOW(), NOW())
    RETURNING id INTO v_workspace_id;

    -- Add user as owner of their workspace
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (v_workspace_id, user_record.id, 'owner', NOW());

    -- Set this as their active workspace
    UPDATE user_preferences
    SET active_workspace_id = v_workspace_id
    WHERE user_id = user_record.id;

    -- Insert preferences if they don't exist
    INSERT INTO user_preferences (user_id, active_workspace_id, created_at, updated_at)
    VALUES (user_record.id, v_workspace_id, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET active_workspace_id = v_workspace_id;

    -- Migrate user's categories to their workspace
    UPDATE categories
    SET workspace_id = v_workspace_id
    WHERE user_id = user_record.id;

    -- Migrate user's labels to their workspace
    UPDATE labels
    SET workspace_id = v_workspace_id
    WHERE user_id = user_record.id;

    -- Migrate user's tags to their workspace
    UPDATE tags
    SET workspace_id = v_workspace_id
    WHERE user_id = user_record.id;

    -- Migrate user's views to their workspace
    UPDATE views
    SET workspace_id = v_workspace_id
    WHERE user_id = user_record.id;

    -- Migrate user's transaction templates to their workspace
    UPDATE transaction_templates
    SET workspace_id = v_workspace_id
    WHERE user_id = user_record.id;

    -- Migrate wallets owned by this user to their workspace
    -- Only process wallets where this user is an owner
    FOR wallet_record IN
      SELECT DISTINCT w.id
      FROM wallets w
      JOIN user_wallets uw ON w.id = uw.wallet_id
      WHERE uw.user_id = user_record.id
      AND uw.role = 'owner'
      AND w.workspace_id IS NULL
    LOOP
      -- Set workspace_id for this wallet
      UPDATE wallets
      SET workspace_id = v_workspace_id
      WHERE id = wallet_record.id;

      -- Add all users with access to this wallet as workspace members
      -- if they aren't already members
      INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
      SELECT
        v_workspace_id,
        uw.user_id,
        uw.role,
        NOW()
      FROM user_wallets uw
      WHERE uw.wallet_id = wallet_record.id
      AND uw.user_id != user_record.id -- Don't re-add the owner
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END LOOP;

  END LOOP;
END $$;

-- ============================================================================
-- STEP 3.5: Handle any remaining NULL workspace_id values
-- ============================================================================

-- Handle wallets that don't have owners (only editors/readers or no members at all)
-- Assign them to the first member's workspace, or to the first user's workspace if no members
DO $$
DECLARE
  wallet_record RECORD;
  v_workspace_id UUID;
  v_user_id UUID;
BEGIN
  -- For each wallet that still has NULL workspace_id
  FOR wallet_record IN
    SELECT w.id
    FROM wallets w
    WHERE w.workspace_id IS NULL
  LOOP
    -- Try to find a member (any role) for this wallet
    SELECT uw.user_id INTO v_user_id
    FROM user_wallets uw
    WHERE uw.wallet_id = wallet_record.id
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      -- Get this user's workspace (should be their Personal workspace)
      SELECT active_workspace_id INTO v_workspace_id
      FROM user_preferences
      WHERE user_id = v_user_id;

      IF v_workspace_id IS NOT NULL THEN
        -- Assign wallet to this workspace
        UPDATE wallets
        SET workspace_id = v_workspace_id
        WHERE id = wallet_record.id;

        -- Add all wallet members to this workspace if not already members
        INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
        SELECT
          v_workspace_id,
          uw.user_id,
          uw.role,
          NOW()
        FROM user_wallets uw
        WHERE uw.wallet_id = wallet_record.id
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
      END IF;
    ELSE
      -- Wallet has no members at all - this is an orphaned wallet
      -- Assign it to the first user's workspace as a fallback
      SELECT active_workspace_id INTO v_workspace_id
      FROM user_preferences
      LIMIT 1;

      IF v_workspace_id IS NOT NULL THEN
        UPDATE wallets
        SET workspace_id = v_workspace_id
        WHERE id = wallet_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3.6: Handle remaining NULL workspace_id for other tables
-- ============================================================================

-- For categories, labels, tags, views, and transaction_templates that still have NULL workspace_id
-- These might exist if they reference deleted users or were created in an inconsistent state
DO $$
DECLARE
  v_default_workspace_id UUID;
BEGIN
  -- Get the first available workspace as a fallback
  SELECT id INTO v_default_workspace_id
  FROM workspaces
  LIMIT 1;

  IF v_default_workspace_id IS NOT NULL THEN
    -- Assign any orphaned categories to the default workspace
    UPDATE categories
    SET workspace_id = v_default_workspace_id
    WHERE workspace_id IS NULL;

    -- Assign any orphaned labels to the default workspace
    UPDATE labels
    SET workspace_id = v_default_workspace_id
    WHERE workspace_id IS NULL;

    -- Assign any orphaned tags to the default workspace
    UPDATE tags
    SET workspace_id = v_default_workspace_id
    WHERE workspace_id IS NULL;

    -- Assign any orphaned views to the default workspace
    UPDATE views
    SET workspace_id = v_default_workspace_id
    WHERE workspace_id IS NULL;

    -- Assign any orphaned transaction templates to the default workspace
    UPDATE transaction_templates
    SET workspace_id = v_default_workspace_id
    WHERE workspace_id IS NULL;
  END IF;
END $$;

-- Delete any rows that still have NULL workspace_id (if no workspaces exist at all)
-- This is a safety measure that should rarely trigger
DELETE FROM categories WHERE workspace_id IS NULL;
DELETE FROM labels WHERE workspace_id IS NULL;
DELETE FROM tags WHERE workspace_id IS NULL;
DELETE FROM views WHERE workspace_id IS NULL;
DELETE FROM transaction_templates WHERE workspace_id IS NULL;

-- ============================================================================
-- STEP 4: Make workspace_id NOT NULL and drop user_id columns
-- ============================================================================

-- Make workspace_id NOT NULL
ALTER TABLE wallets ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE labels ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE tags ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE views ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE transaction_templates ALTER COLUMN workspace_id SET NOT NULL;

-- Drop old RLS policies that depend on user_id before dropping the columns
-- Categories policies
DROP POLICY IF EXISTS "categories_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Labels policies
DROP POLICY IF EXISTS "labels_policy" ON labels;
DROP POLICY IF EXISTS "labels_insert_policy" ON labels;
DROP POLICY IF EXISTS "labels_update_policy" ON labels;
DROP POLICY IF EXISTS "labels_delete_policy" ON labels;

-- Tags policies
DROP POLICY IF EXISTS "tags_policy" ON tags;
DROP POLICY IF EXISTS "tags_insert_policy" ON tags;
DROP POLICY IF EXISTS "tags_update_policy" ON tags;
DROP POLICY IF EXISTS "tags_delete_policy" ON tags;

-- Views policies
DROP POLICY IF EXISTS "views_policy" ON views;
DROP POLICY IF EXISTS "views_insert_policy" ON views;
DROP POLICY IF EXISTS "views_update_policy" ON views;
DROP POLICY IF EXISTS "views_delete_policy" ON views;

-- Transaction templates policies
DROP POLICY IF EXISTS "transaction_templates_policy" ON transaction_templates;
DROP POLICY IF EXISTS "transaction_templates_insert_policy" ON transaction_templates;
DROP POLICY IF EXISTS "transaction_templates_update_policy" ON transaction_templates;
DROP POLICY IF EXISTS "transaction_templates_delete_policy" ON transaction_templates;

-- Transaction tags policies (depend on tags.user_id)
DROP POLICY IF EXISTS "transaction_tags_select" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_insert" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_delete" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_update" ON transaction_tags;

-- Drop user_id columns and their foreign key constraints
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE categories DROP COLUMN IF EXISTS user_id;

ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_user_id_fkey;
ALTER TABLE labels DROP COLUMN IF EXISTS user_id;

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_id_fkey;
ALTER TABLE tags DROP COLUMN IF EXISTS user_id;

ALTER TABLE views DROP CONSTRAINT IF EXISTS views_user_id_fkey;
ALTER TABLE views DROP COLUMN IF EXISTS user_id;

ALTER TABLE transaction_templates DROP COLUMN IF EXISTS user_id;

-- Create indexes on workspace_id columns for better query performance
CREATE INDEX idx_wallets_workspace_id ON wallets(workspace_id);
CREATE INDEX idx_categories_workspace_id ON categories(workspace_id);
CREATE INDEX idx_labels_workspace_id ON labels(workspace_id);
CREATE INDEX idx_tags_workspace_id ON tags(workspace_id);
CREATE INDEX idx_views_workspace_id ON views(workspace_id);
CREATE INDEX idx_transaction_templates_workspace_id ON transaction_templates(workspace_id);

-- ============================================================================
-- STEP 5: Update RLS policies for new workspace model
-- ============================================================================

-- Helper function to check workspace membership
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check workspace role
CREATE OR REPLACE FUNCTION has_workspace_role(workspace_uuid UUID, required_role TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
    AND role = ANY(required_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies for workspaces table
-- ============================================================================

DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

-- Users can see workspaces they are members of
CREATE POLICY "workspaces_select" ON workspaces
FOR SELECT TO authenticated
USING (is_workspace_member(id));

-- Any authenticated user can create a workspace
CREATE POLICY "workspaces_insert" ON workspaces
FOR INSERT TO authenticated
WITH CHECK (true);

-- Only owners can update workspace
CREATE POLICY "workspaces_update" ON workspaces
FOR UPDATE TO authenticated
USING (has_workspace_role(id, ARRAY['owner']))
WITH CHECK (has_workspace_role(id, ARRAY['owner']));

-- Only owners can delete workspace
CREATE POLICY "workspaces_delete" ON workspaces
FOR DELETE TO authenticated
USING (has_workspace_role(id, ARRAY['owner']));

-- ============================================================================
-- RLS Policies for workspace_members table
-- ============================================================================

DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- Users can see members of workspaces they belong to
CREATE POLICY "workspace_members_select" ON workspace_members
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Owners can add members, OR if workspace has no members yet (first member = owner)
CREATE POLICY "workspace_members_insert" ON workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  has_workspace_role(workspace_id, ARRAY['owner'])
  OR NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspace_id)
);

-- Only owners can update member roles
CREATE POLICY "workspace_members_update" ON workspace_members
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner']));

-- Only owners can remove members
CREATE POLICY "workspace_members_delete" ON workspace_members
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']));

-- ============================================================================
-- RLS Policies for wallets table
-- ============================================================================

DROP POLICY IF EXISTS "wallet_select" ON wallets;
DROP POLICY IF EXISTS "wallet_insert" ON wallets;
DROP POLICY IF EXISTS "wallet_update" ON wallets;
DROP POLICY IF EXISTS "wallet_delete" ON wallets;

-- Users can see wallets in their workspaces
CREATE POLICY "wallet_select" ON wallets
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Owners and editors can create wallets
CREATE POLICY "wallet_insert" ON wallets
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Only wallet owners (via user_wallets) can update
-- Note: Keep existing wallet-level ownership via user_wallets
CREATE POLICY "wallet_update" ON wallets
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wallets
    WHERE user_wallets.user_id = auth.uid()
    AND user_wallets.wallet_id = wallets.id
    AND user_wallets.role = 'owner'
  )
)
WITH CHECK (true);

-- Only wallet owners can delete
CREATE POLICY "wallet_delete" ON wallets
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wallets
    WHERE user_wallets.user_id = auth.uid()
    AND user_wallets.wallet_id = wallets.id
    AND user_wallets.role = 'owner'
  )
);

-- ============================================================================
-- RLS Policies for categories table
-- ============================================================================

DROP POLICY IF EXISTS "categories_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Users can see categories in their workspaces
CREATE POLICY "categories_select" ON categories
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Owners and editors can create categories
CREATE POLICY "categories_insert" ON categories
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can update categories
CREATE POLICY "categories_update" ON categories
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can delete categories
CREATE POLICY "categories_delete" ON categories
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- ============================================================================
-- RLS Policies for labels table
-- ============================================================================

DROP POLICY IF EXISTS "labels_policy" ON labels;
DROP POLICY IF EXISTS "labels_insert_policy" ON labels;
DROP POLICY IF EXISTS "labels_update_policy" ON labels;
DROP POLICY IF EXISTS "labels_delete_policy" ON labels;

-- Users can see labels in their workspaces
CREATE POLICY "labels_select" ON labels
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Owners and editors can create labels
CREATE POLICY "labels_insert" ON labels
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can update labels
CREATE POLICY "labels_update" ON labels
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can delete labels
CREATE POLICY "labels_delete" ON labels
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- ============================================================================
-- RLS Policies for tags table
-- ============================================================================

DROP POLICY IF EXISTS "tags_policy" ON tags;
DROP POLICY IF EXISTS "tags_insert_policy" ON tags;
DROP POLICY IF EXISTS "tags_update_policy" ON tags;
DROP POLICY IF EXISTS "tags_delete_policy" ON tags;

-- Users can see tags in their workspaces
CREATE POLICY "tags_select" ON tags
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Owners and editors can create tags
CREATE POLICY "tags_insert" ON tags
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can update tags
CREATE POLICY "tags_update" ON tags
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can delete tags
CREATE POLICY "tags_delete" ON tags
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- ============================================================================
-- RLS Policies for views table
-- ============================================================================

DROP POLICY IF EXISTS "views_policy" ON views;
DROP POLICY IF EXISTS "views_insert_policy" ON views;
DROP POLICY IF EXISTS "views_update_policy" ON views;
DROP POLICY IF EXISTS "views_delete_policy" ON views;

-- Users can see views in their workspaces
CREATE POLICY "views_select" ON views
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Owners and editors can create views
CREATE POLICY "views_insert" ON views
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can update views
CREATE POLICY "views_update" ON views
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can delete views
CREATE POLICY "views_delete" ON views
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- ============================================================================
-- RLS Policies for transaction_templates table
-- ============================================================================

DROP POLICY IF EXISTS "transaction_templates_policy" ON transaction_templates;
DROP POLICY IF EXISTS "transaction_templates_insert_policy" ON transaction_templates;
DROP POLICY IF EXISTS "transaction_templates_update_policy" ON transaction_templates;
DROP POLICY IF EXISTS "transaction_templates_delete_policy" ON transaction_templates;

-- Users can see templates in their workspaces
CREATE POLICY "transaction_templates_select" ON transaction_templates
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Owners and editors can create templates
CREATE POLICY "transaction_templates_insert" ON transaction_templates
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can update templates
CREATE POLICY "transaction_templates_update" ON transaction_templates
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- Owners and editors can delete templates
CREATE POLICY "transaction_templates_delete" ON transaction_templates
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

-- ============================================================================
-- Update uniqueness constraints for workspace scope
-- ============================================================================

-- Drop old uniqueness constraints
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_type_user_id_unique;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS unique_category_name_type_user;

-- Add workspace-scoped uniqueness constraints
ALTER TABLE categories ADD CONSTRAINT categories_name_type_workspace_unique
  UNIQUE (name, type, workspace_id);

-- Tags uniqueness (name per workspace)
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_user_id_unique;
ALTER TABLE tags ADD CONSTRAINT tags_title_workspace_unique
  UNIQUE (title, workspace_id);

-- Labels uniqueness (name per workspace)
ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_name_user_id_unique;
ALTER TABLE labels ADD CONSTRAINT labels_name_workspace_unique
  UNIQUE (name, workspace_id);
