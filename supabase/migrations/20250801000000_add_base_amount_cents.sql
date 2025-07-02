-- Add fields to store transaction amount in base currency
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS base_amount_cents BIGINT,
ADD COLUMN IF NOT EXISTS conversion_rate_to_base DECIMAL(20,10);

-- Function to compute transaction totals in base currency
CREATE OR REPLACE FUNCTION get_transaction_total(
  p_wallet_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL,
  p_label_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_tag UUID DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_transfer_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_id UUID DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT
    SUM(COALESCE(t.base_amount_cents, 0)) INTO total
  FROM transaction_list t
  WHERE
    (p_wallet_id IS NULL OR t.wallet_id = p_wallet_id)
    AND (p_from_date IS NULL OR t.date >= p_from_date)
    AND (p_to_date IS NULL OR t.date <= p_to_date)
    AND (p_label_id IS NULL OR t.label_id = p_label_id)
    AND (p_category_id IS NULL OR t.category_id = p_category_id)
    AND (p_tag IS NULL OR p_tag = ANY(t.tag_ids))
    AND (p_type IS NULL OR t.type = p_type::transaction_type_enum)
    AND (p_transfer_id IS NULL OR t.transfer_id = p_transfer_id)
    AND (p_description IS NULL OR t.description ILIKE '%' || p_description || '%')
    AND (p_id IS NULL OR t.id = p_id);

  RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill base_amount_cents for existing rows
CREATE OR REPLACE FUNCTION backfill_transaction_base_amounts()
RETURNS void AS $$
BEGIN
  UPDATE transactions t
  SET
    base_amount_cents = round(t.amount_cents * sub.rate)::BIGINT,
    conversion_rate_to_base = sub.rate
  FROM (
    SELECT t2.id, COALESCE(cc.rate, 1) AS rate
    FROM transactions t2
    JOIN user_wallets uw ON t2.wallet_id = uw.wallet_id
    LEFT JOIN user_preferences up ON up.user_id = uw.user_id
    LEFT JOIN currency_conversions cc
      ON cc.source_currency = t2.currency
     AND cc.target_currency = COALESCE(up.base_currency, 'USD')
     AND cc.date = t2.date
    WHERE t2.currency != COALESCE(up.base_currency, 'USD')
  ) sub
  WHERE t.id = sub.id
    AND t.base_amount_cents IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute backfill for existing data
-- SELECT backfill_transaction_base_amounts();
