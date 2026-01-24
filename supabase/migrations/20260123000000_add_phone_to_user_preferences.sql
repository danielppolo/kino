ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS get_wallet_members(UUID);

CREATE FUNCTION get_wallet_members(wallet_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  wallet_id UUID,
  role TEXT,
  email TEXT,
  phone TEXT,
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
    up.phone,
    uw.created_at
  FROM user_wallets uw
  JOIN auth.users au ON uw.user_id = au.id
  LEFT JOIN public.user_preferences up ON up.user_id = uw.user_id
  WHERE uw.wallet_id = wallet_uuid
  ORDER BY uw.created_at ASC;
END;
$$;
