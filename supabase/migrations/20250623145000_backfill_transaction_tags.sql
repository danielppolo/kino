-- Backfill transaction_tags from existing transactions.tags array
INSERT INTO public.transaction_tags (transaction_id, tag_id)
SELECT t.id, tg.id
FROM public.transactions t
JOIN LATERAL unnest(t.tags) AS tag_title(title) ON true
JOIN public.tags tg ON tg.title = tag_title.title
ON CONFLICT DO NOTHING;

-- Drop old tags column
ALTER TABLE public.transactions DROP COLUMN IF EXISTS tags;

-- Recreate transaction_list view with aggregated tags and tag_ids
DROP VIEW IF EXISTS public.transaction_list;
CREATE VIEW public.transaction_list AS
SELECT
  t.id,
  t.created_at,
  t.description,
  t.amount_cents,
  t.date,
  t.currency,
  t.type,
  t.wallet_id,
  t.category_id,
  t.label_id,
  t.transfer_id,
  t.note,
  array_remove(array_agg(DISTINCT tg.title ORDER BY tg.title), NULL) AS tags,
  array_remove(array_agg(DISTINCT tg.id ORDER BY tg.title), NULL) AS tag_ids,
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
