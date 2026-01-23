-- Fix get_wallet_members: auth.users.email is varchar(255), cast to text to match return type
CREATE OR REPLACE FUNCTION get_wallet_members(wallet_uuid UUID)
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
