-- Create function to lookup user by email
-- This is needed for adding workspace members by email

CREATE OR REPLACE FUNCTION lookup_user_by_email(user_email TEXT)
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au
  WHERE au.email = user_email;
END;
$$;
