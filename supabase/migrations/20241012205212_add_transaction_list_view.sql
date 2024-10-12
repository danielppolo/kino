CREATE OR REPLACE VIEW public.transaction_list AS
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
  CASE
    WHEN t.type = 'transfer' THEN ct.wallet_id
    ELSE NULL
  END AS transfer_wallet_id
FROM
  public.transactions t
LEFT JOIN
  public.transactions ct ON
  t.transfer_id = ct.transfer_id AND t.id != ct.id;