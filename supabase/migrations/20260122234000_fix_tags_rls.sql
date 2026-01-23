-- Enable RLS on tags table (was missing from original migration)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Fix tags_insert_policy to verify user_id matches auth.uid()
DROP POLICY IF EXISTS "tags_insert_policy" ON tags;
CREATE POLICY "tags_insert_policy" 
    ON tags 
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Enable RLS on transaction_tags table
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

-- SELECT: user owns tag AND has access to transaction's wallet
CREATE POLICY "transaction_tags_select" ON transaction_tags
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM tags WHERE tags.id = transaction_tags.tag_id AND tags.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM transactions t
    JOIN user_wallets uw ON t.wallet_id = uw.wallet_id
    WHERE t.id = transaction_tags.transaction_id AND uw.user_id = auth.uid()
  )
);

-- INSERT: user owns tag AND has editor access to transaction's wallet  
CREATE POLICY "transaction_tags_insert" ON transaction_tags
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM tags WHERE tags.id = tag_id AND tags.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM transactions t
    JOIN user_wallets uw ON t.wallet_id = uw.wallet_id
    WHERE t.id = transaction_id AND uw.user_id = auth.uid() AND uw.role = 'editor'
  )
);

-- DELETE: user owns tag AND has editor access to transaction's wallet
CREATE POLICY "transaction_tags_delete" ON transaction_tags
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM tags WHERE tags.id = transaction_tags.tag_id AND tags.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM transactions t
    JOIN user_wallets uw ON t.wallet_id = uw.wallet_id
    WHERE t.id = transaction_tags.transaction_id AND uw.user_id = auth.uid() AND uw.role = 'editor'
  )
);

-- Fix views_insert_policy to verify user_id matches auth.uid()
DROP POLICY IF EXISTS "views_insert_policy" ON views;
CREATE POLICY "views_insert_policy" 
    ON views 
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
