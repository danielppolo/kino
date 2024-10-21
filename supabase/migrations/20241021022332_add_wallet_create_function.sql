CREATE OR REPLACE FUNCTION insert_wallet_and_user_wallet(
  wallet_name TEXT, 
  wallet_currency TEXT
) 
RETURNS TABLE (wallet_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows bypassing RLS inside the function
AS $$
BEGIN
  -- Insert the wallet and return the generated id
  INSERT INTO wallets (name, currency)
  VALUES (wallet_name, wallet_currency)
  RETURNING id INTO wallet_id;

  -- Insert the user-wallet relation in user_wallets
  INSERT INTO user_wallets (user_id, wallet_id, role)
  VALUES (auth.uid(), wallet_id, 'editor');  -- Fix the string literal here

  -- Return the wallet_id
  RETURN QUERY SELECT wallet_id;
END;
$$;