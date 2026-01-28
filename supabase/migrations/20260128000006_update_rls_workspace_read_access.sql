-- Migration: Update RLS policies for categories, labels, and tags to allow READ for all workspace members

-- Categories: Allow all workspace members to read
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
CREATE POLICY "categories_select_policy" ON categories
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Labels: Allow all workspace members to read
DROP POLICY IF EXISTS "labels_select_policy" ON labels;
CREATE POLICY "labels_select_policy" ON labels
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Tags: Allow all workspace members to read
DROP POLICY IF EXISTS "tags_select_policy" ON tags;
CREATE POLICY "tags_select_policy" ON tags
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Views: Allow all workspace members to read
DROP POLICY IF EXISTS "views_select_policy" ON views;
CREATE POLICY "views_select_policy" ON views
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Transaction Templates: Allow all workspace members to read
DROP POLICY IF EXISTS "transaction_templates_select_policy" ON transaction_templates;
CREATE POLICY "transaction_templates_select_policy" ON transaction_templates
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
