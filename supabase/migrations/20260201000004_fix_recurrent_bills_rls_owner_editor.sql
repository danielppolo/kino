-- Fix recurrent_bills RLS: allow both owner and editor (matching bills table).
-- Previously only role = 'editor' was allowed, so wallet owners could not create recurrent bills.

DROP POLICY IF EXISTS "recurrent_bill_insert" ON recurrent_bills;
DROP POLICY IF EXISTS "recurrent_bill_update" ON recurrent_bills;
DROP POLICY IF EXISTS "recurrent_bill_delete" ON recurrent_bills;

CREATE POLICY "recurrent_bill_insert" ON recurrent_bills
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND recurrent_bills.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);

CREATE POLICY "recurrent_bill_update" ON recurrent_bills
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND recurrent_bills.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
) WITH CHECK (true);

CREATE POLICY "recurrent_bill_delete" ON recurrent_bills
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND recurrent_bills.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);
