-- Update user_wallets SELECT policy to only allow users to see members from wallets they belong to
-- This replaces the overly permissive "using (true)" policy

DROP POLICY IF EXISTS "user_wallets_select" ON user_wallets;

CREATE POLICY "user_wallets_select" ON user_wallets
FOR SELECT TO authenticated
USING (
  -- Allow users to see members of wallets they belong to
  EXISTS (
    SELECT 1 FROM user_wallets uw
    WHERE uw.user_id = auth.uid()
    AND uw.wallet_id = user_wallets.wallet_id
  )
);

-- Update get_wallet_members function to remove phone field
DROP FUNCTION IF EXISTS get_wallet_members(UUID);

CREATE FUNCTION get_wallet_members(wallet_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  wallet_id UUID,
  role TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uw.id,
    uw.user_id,
    uw.wallet_id,
    uw.role,
    au.email::text,
    uw.created_at
  FROM user_wallets uw
  JOIN auth.users au ON uw.user_id = au.id
  WHERE uw.wallet_id = wallet_uuid
  ORDER BY uw.created_at ASC;
END;
$$;

-- Create a new function to get members for multiple wallets efficiently
CREATE OR REPLACE FUNCTION get_all_wallet_members(wallet_uuids UUID[])
RETURNS TABLE (
  id UUID,
  user_id UUID,
  wallet_id UUID,
  role TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uw.id,
    uw.user_id,
    uw.wallet_id,
    uw.role,
    au.email::text,
    uw.created_at
  FROM user_wallets uw
  JOIN auth.users au ON uw.user_id = au.id
  WHERE uw.wallet_id = ANY(wallet_uuids)
  ORDER BY uw.created_at ASC;
END;
$$;
