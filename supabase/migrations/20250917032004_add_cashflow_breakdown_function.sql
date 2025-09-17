-- Function to get cashflow breakdown (total, expenses, incomes) in base currency
CREATE OR REPLACE FUNCTION get_cashflow_breakdown(
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
) RETURNS TABLE (
  total_cashflow BIGINT,
  total_expenses BIGINT,
  total_incomes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(COALESCE(t.base_amount_cents, 0)), 0)::BIGINT as total_cashflow,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN COALESCE(t.base_amount_cents, 0) ELSE 0 END), 0)::BIGINT as total_expenses,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN COALESCE(t.base_amount_cents, 0) ELSE 0 END), 0)::BIGINT as total_incomes
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
