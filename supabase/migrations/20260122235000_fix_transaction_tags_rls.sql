-- Align transaction_tags RLS with wallet roles (owner/editor can write)

ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transaction_tags_select" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_insert" ON transaction_tags;
DROP POLICY IF EXISTS "transaction_tags_delete" ON transaction_tags;

-- SELECT: user owns tag AND has access to transaction's wallet (any role)
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

-- INSERT: user owns tag AND has owner/editor access to transaction's wallet
CREATE POLICY "transaction_tags_insert" ON transaction_tags
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM tags WHERE tags.id = tag_id AND tags.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM transactions t
    JOIN user_wallets uw ON t.wallet_id = uw.wallet_id
    WHERE t.id = transaction_id AND uw.user_id = auth.uid() AND uw.role IN ('owner', 'editor')
  )
);

-- DELETE: user owns tag AND has owner/editor access to transaction's wallet
CREATE POLICY "transaction_tags_delete" ON transaction_tags
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM tags WHERE tags.id = transaction_tags.tag_id AND tags.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM transactions t
    JOIN user_wallets uw ON t.wallet_id = uw.wallet_id
    WHERE t.id = transaction_tags.transaction_id AND uw.user_id = auth.uid() AND uw.role IN ('owner', 'editor')
  )
);
