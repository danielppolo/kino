-- Migration: Update RLS policies for tags, categories, and labels
-- Restrict create, update, and delete operations to workspace owners only

-- ============================================================================
-- RLS Policies for categories table
-- ============================================================================

-- Drop ALL existing INSERT/UPDATE/DELETE policies (including old names that might still exist)
-- Note: SELECT policies are preserved to allow all workspace members to read
DROP POLICY IF EXISTS "categories_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

-- Only owners can create categories
CREATE POLICY "categories_insert" ON categories
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner']));

-- Only owners can update categories
CREATE POLICY "categories_update" ON categories
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner']));

-- Only owners can delete categories
CREATE POLICY "categories_delete" ON categories
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']));

-- ============================================================================
-- RLS Policies for labels table
-- ============================================================================

-- Drop ALL existing INSERT/UPDATE/DELETE policies (including old names that might still exist)
-- Note: SELECT policies are preserved to allow all workspace members to read
DROP POLICY IF EXISTS "labels_policy" ON labels;
DROP POLICY IF EXISTS "labels_insert_policy" ON labels;
DROP POLICY IF EXISTS "labels_update_policy" ON labels;
DROP POLICY IF EXISTS "labels_delete_policy" ON labels;
DROP POLICY IF EXISTS "labels_insert" ON labels;
DROP POLICY IF EXISTS "labels_update" ON labels;
DROP POLICY IF EXISTS "labels_delete" ON labels;

-- Only owners can create labels
CREATE POLICY "labels_insert" ON labels
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner']));

-- Only owners can update labels
CREATE POLICY "labels_update" ON labels
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner']));

-- Only owners can delete labels
CREATE POLICY "labels_delete" ON labels
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']));

-- ============================================================================
-- RLS Policies for tags table
-- ============================================================================

-- Drop ALL existing INSERT/UPDATE/DELETE policies (including old names that might still exist)
-- Note: SELECT policies are preserved to allow all workspace members to read
DROP POLICY IF EXISTS "tags_policy" ON tags;
DROP POLICY IF EXISTS "tags_insert_policy" ON tags;
DROP POLICY IF EXISTS "tags_update_policy" ON tags;
DROP POLICY IF EXISTS "tags_delete_policy" ON tags;
DROP POLICY IF EXISTS "tags_insert" ON tags;
DROP POLICY IF EXISTS "tags_update" ON tags;
DROP POLICY IF EXISTS "tags_delete" ON tags;

-- Only owners can create tags
CREATE POLICY "tags_insert" ON tags
FOR INSERT TO authenticated
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner']));

-- Only owners can update tags
CREATE POLICY "tags_update" ON tags
FOR UPDATE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']))
WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner']));

-- Only owners can delete tags
CREATE POLICY "tags_delete" ON tags
FOR DELETE TO authenticated
USING (has_workspace_role(workspace_id, ARRAY['owner']));

