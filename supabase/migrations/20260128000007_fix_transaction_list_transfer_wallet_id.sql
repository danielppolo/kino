-- Migration: Fix transaction_list view to show transfer_wallet_id for all transfers
-- regardless of workspace membership

-- Create a SECURITY DEFINER function to get transfer wallet ID bypassing RLS
CREATE OR REPLACE FUNCTION get_transfer_wallet_id(p_transfer_id UUID, p_transaction_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT wallet_id
  FROM transactions
  WHERE transfer_id = p_transfer_id
    AND id != p_transaction_id
  LIMIT 1;
$$;

-- Recreate the transaction_list view using the new function
DROP VIEW IF EXISTS public.transaction_list;

CREATE VIEW public.transaction_list
WITH (security_invoker = on)
AS
SELECT
  t.id,
  t.created_at,
  t.description,
  t.amount_cents,
  t.base_amount_cents,
  t.date,
  t.currency,
  t.type,
  t.wallet_id,
  t.category_id,
  t.label_id,
  t.transfer_id,
  t.note,
  array_remove(array_agg(DISTINCT tg.title), NULL) AS tags,
  array_remove(array_agg(DISTINCT tg.id), NULL) AS tag_ids,
  CASE
    WHEN t.type = 'transfer' AND t.transfer_id IS NOT NULL
    THEN get_transfer_wallet_id(t.transfer_id, t.id)
    ELSE NULL
  END AS transfer_wallet_id
FROM
  public.transactions t
LEFT JOIN public.transaction_tags tt ON t.id = tt.transaction_id
LEFT JOIN public.tags tg ON tg.id = tt.tag_id
GROUP BY t.id;
