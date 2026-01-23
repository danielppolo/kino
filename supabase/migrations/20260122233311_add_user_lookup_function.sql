-- Function to get user_id from email (for adding wallet members)
-- This function allows owners to look up users by email to add them to wallets
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::text
  FROM auth.users au
  WHERE au.email = user_email
  LIMIT 1;
END;
$$;

-- Function to get wallet members with user email
-- Returns user_wallets entries with user email for display
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
