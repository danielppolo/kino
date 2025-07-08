-- Add base_amount_cents to transaction_list view
DROP VIEW IF EXISTS public.transaction_list;
CREATE VIEW public.transaction_list AS
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
    WHEN t.type = 'transfer' THEN ct.wallet_id
    ELSE NULL
  END AS transfer_wallet_id
FROM
  public.transactions t
LEFT JOIN public.transaction_tags tt ON t.id = tt.transaction_id
LEFT JOIN public.tags tg ON tg.id = tt.tag_id
LEFT JOIN public.transactions ct ON t.transfer_id = ct.transfer_id AND t.id != ct.id
GROUP BY t.id, ct.wallet_id;
