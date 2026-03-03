-- Fix transaction_tags RLS to use workspace-based authorization
-- tags.user_id was removed when workspaces were introduced.

ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transaction_tags_select" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_insert" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_delete" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_update" ON transaction_tags;

-- SELECT: user must be a member of the workspace that owns both the tag and transaction wallet
CREATE POLICY "transaction_tags_select" ON transaction_tags
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tags tg
    JOIN transactions t ON t.id = transaction_tags.transaction_id
    JOIN wallets w ON w.id = t.wallet_id
    WHERE tg.id = transaction_tags.tag_id
      AND tg.workspace_id = w.workspace_id
      AND is_workspace_member(tg.workspace_id)
  )
);

-- INSERT: user must be owner/editor in the shared workspace
CREATE POLICY "transaction_tags_insert" ON transaction_tags
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM tags tg
    JOIN transactions t ON t.id = transaction_id
    JOIN wallets w ON w.id = t.wallet_id
    WHERE tg.id = tag_id
      AND tg.workspace_id = w.workspace_id
      AND has_workspace_role(tg.workspace_id, ARRAY['owner', 'editor'])
  )
);

-- DELETE: user must be owner/editor in the shared workspace
CREATE POLICY "transaction_tags_delete" ON transaction_tags
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tags tg
    JOIN transactions t ON t.id = transaction_tags.transaction_id
    JOIN wallets w ON w.id = t.wallet_id
    WHERE tg.id = transaction_tags.tag_id
      AND tg.workspace_id = w.workspace_id
      AND has_workspace_role(tg.workspace_id, ARRAY['owner', 'editor'])
  )
);
