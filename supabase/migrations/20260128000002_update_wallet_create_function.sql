-- Update wallet creation function to include workspace_id

CREATE OR REPLACE FUNCTION insert_wallet_and_user_wallet(
  wallet_name TEXT,
  wallet_currency TEXT,
  p_workspace_id UUID
)
RETURNS TABLE (wallet_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the wallet with workspace_id and return the generated id
  INSERT INTO wallets (name, currency, workspace_id)
  VALUES (wallet_name, wallet_currency, p_workspace_id)
  RETURNING id INTO wallet_id;

  -- Insert the user-wallet relation in user_wallets
  INSERT INTO user_wallets (user_id, wallet_id, role)
  VALUES (auth.uid(), wallet_id, 'owner');

  -- Return the wallet_id
  RETURN QUERY SELECT wallet_id;
END;
$$;
