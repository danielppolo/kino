-- Create a function to calculate transaction totals with proper currency handling
-- This function avoids the 1000 record limit by using SQL aggregation directly
CREATE OR REPLACE FUNCTION get_transaction_total_by_currency(
  p_wallet_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL,
  p_label_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_tag_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_transfer_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_id UUID DEFAULT NULL
)
RETURNS TABLE (
  currency TEXT,
  total_cents BIGINT,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tl.currency,
    SUM(tl.amount_cents) as total_cents,
    COUNT(*) as transaction_count
  FROM transaction_list tl
  WHERE 
    (p_wallet_id IS NULL OR tl.wallet_id = p_wallet_id)
    AND (p_from_date IS NULL OR tl.date >= p_from_date)
    AND (p_to_date IS NULL OR tl.date <= p_to_date)
    AND (p_label_id IS NULL OR tl.label_id = p_label_id)
    AND (p_category_id IS NULL OR tl.category_id = p_category_id)
    AND (p_tag_id IS NULL OR (tl.tag_ids IS NOT NULL AND array_length(tl.tag_ids, 1) > 0 AND p_tag_id = ANY(tl.tag_ids)))
    AND (p_type IS NULL OR tl.type = p_type::transaction_type_enum)
    AND (p_transfer_id IS NULL OR tl.transfer_id = p_transfer_id)
    AND (p_description IS NULL OR tl.description ILIKE '%' || p_description || '%')
    AND (p_id IS NULL OR tl.id = p_id)
  GROUP BY tl.currency
  ORDER BY tl.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 