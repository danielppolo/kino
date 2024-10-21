CREATE OR REPLACE FUNCTION insert_wallet_and_user_wallet(
  wallet_name TEXT, 
  wallet_currency TEXT, 
  user_id UUID
) 
RETURNS TABLE (wallet_id UUID) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Start a transaction to insert into wallets and user_wallets atomically
  INSERT INTO wallets (name, currency)
  VALUES (wallet_name, wallet_currency)
  RETURNING id INTO wallet_id;

  -- Now insert the user-wallet relation in user_wallets
  INSERT INTO user_wallets (user_id, wallet_id, role)
  VALUES (user_id, wallet_id, "editor");

  -- Return the inserted wallet id
  RETURN QUERY SELECT wallet_id;
END;
$$;