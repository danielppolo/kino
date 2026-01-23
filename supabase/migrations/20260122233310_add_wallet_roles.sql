-- Migration: Add wallet roles (owner/editor/reader) and update RLS policies

-- Step 1: Drop old check constraint to allow role updates
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS user_wallets_role_check;

-- Step 2: Update existing roles: viewer → reader, editor → owner
UPDATE user_wallets SET role = 'reader' WHERE role = 'viewer';
UPDATE user_wallets SET role = 'owner' WHERE role = 'editor';

-- Step 3: Add new check constraint with owner/editor/reader
ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_role_check 
  CHECK (role IN ('owner', 'editor', 'reader'));

-- Step 4: Add unique constraint on (user_id, wallet_id) to prevent duplicates
ALTER TABLE user_wallets 
ADD CONSTRAINT user_wallets_user_wallet_unique UNIQUE (user_id, wallet_id);

-- Step 5: Update RLS Policies for user_wallets (only owners can manage membership)
DROP POLICY IF EXISTS "user_wallets_insert" ON user_wallets;
DROP POLICY IF EXISTS "user_wallets_update" ON user_wallets;
DROP POLICY IF EXISTS "user_wallets_delete" ON user_wallets;

CREATE POLICY "user_wallets_insert" ON user_wallets
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_wallets uw
    WHERE uw.user_id = auth.uid()
    AND uw.wallet_id = user_wallets.wallet_id
    AND uw.role = 'owner'
  )
  OR NOT EXISTS (SELECT 1 FROM user_wallets uw WHERE uw.wallet_id = user_wallets.wallet_id)
);

CREATE POLICY "user_wallets_update" ON user_wallets
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wallets uw
    WHERE uw.user_id = auth.uid()
    AND uw.wallet_id = user_wallets.wallet_id
    AND uw.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_wallets uw
    WHERE uw.user_id = auth.uid()
    AND uw.wallet_id = user_wallets.wallet_id
    AND uw.role = 'owner'
  )
);

CREATE POLICY "user_wallets_delete" ON user_wallets
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wallets uw
    WHERE uw.user_id = auth.uid()
    AND uw.wallet_id = user_wallets.wallet_id
    AND uw.role = 'owner'
  )
);

-- Step 6: Update RLS Policies for transactions (owner OR editor can write)
DROP POLICY IF EXISTS "transaction_insert" ON transactions;
DROP POLICY IF EXISTS "transaction_update" ON transactions;
DROP POLICY IF EXISTS "transaction_delete" ON transactions;

CREATE POLICY "transaction_insert" ON transactions
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND transactions.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);

CREATE POLICY "transaction_update" ON transactions
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND transactions.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
) WITH CHECK (true);

CREATE POLICY "transaction_delete" ON transactions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND transactions.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);

-- Step 7: Update RLS Policies for bills (owner OR editor can write)
DROP POLICY IF EXISTS "bill_insert" ON bills;
DROP POLICY IF EXISTS "bill_update" ON bills;
DROP POLICY IF EXISTS "bill_delete" ON bills;

CREATE POLICY "bill_insert" ON bills
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND bills.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);

CREATE POLICY "bill_update" ON bills
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND bills.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
) WITH CHECK (true);

CREATE POLICY "bill_delete" ON bills
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM wallets
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND bills.wallet_id = wallets.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);

-- Step 7: Update RLS Policies for bill_payments (owner OR editor can write)
DROP POLICY IF EXISTS "bill_payment_insert" ON bill_payments;
DROP POLICY IF EXISTS "bill_payment_delete" ON bill_payments;

CREATE POLICY "bill_payment_insert" ON bill_payments
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM bills
    JOIN wallets ON bills.wallet_id = wallets.id
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND bill_payments.bill_id = bills.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);

CREATE POLICY "bill_payment_delete" ON bill_payments
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM bills
    JOIN wallets ON bills.wallet_id = wallets.id
    JOIN user_wallets ON wallets.id = user_wallets.wallet_id
    WHERE user_wallets.user_id = auth.uid()
    AND bill_payments.bill_id = bills.id
    AND user_wallets.role IN ('owner', 'editor')
  )
);

-- Step 9: Update RLS Policies for wallets (only owners can update/delete)
DROP POLICY IF EXISTS "wallet_update" ON wallets;
DROP POLICY IF EXISTS "wallet_delete" ON wallets;

CREATE POLICY "wallet_update" ON wallets
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_wallets
    WHERE user_wallets.user_id = auth.uid()
    AND user_wallets.wallet_id = wallets.id
    AND user_wallets.role = 'owner'
  )
) WITH CHECK (true);

CREATE POLICY "wallet_delete" ON wallets
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_wallets
    WHERE user_wallets.user_id = auth.uid()
    AND user_wallets.wallet_id = wallets.id
    AND user_wallets.role = 'owner'
  )
);
