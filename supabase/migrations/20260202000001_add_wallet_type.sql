CREATE TYPE wallet_type AS ENUM ('bank_account', 'card', 'cash');

ALTER TABLE wallets
ADD COLUMN wallet_type wallet_type NOT NULL DEFAULT 'bank_account';

DROP FUNCTION IF EXISTS insert_wallet_and_user_wallet(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION insert_wallet_and_user_wallet(
  wallet_name TEXT,
  wallet_currency TEXT,
  p_workspace_id UUID,
  p_wallet_type wallet_type DEFAULT 'bank_account'
)
RETURNS TABLE (wallet_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO wallets (name, currency, workspace_id, wallet_type)
  VALUES (wallet_name, wallet_currency, p_workspace_id, p_wallet_type)
  RETURNING id INTO wallet_id;

  INSERT INTO user_wallets (user_id, wallet_id, role)
  VALUES (auth.uid(), wallet_id, 'owner');

  RETURN QUERY SELECT wallet_id;
END;
$$;
