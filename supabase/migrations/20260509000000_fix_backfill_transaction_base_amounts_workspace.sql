-- base_currency moved to workspaces (20260128000005); backfill still referenced user_preferences.base_currency.

CREATE OR REPLACE FUNCTION public.backfill_transaction_base_amounts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.transactions t
  SET
    base_amount_cents = round(t.amount_cents * sub.rate)::bigint,
    conversion_rate_to_base = sub.rate
  FROM (
    SELECT
      t2.id,
      coalesce(cc.rate, 1) AS rate
    FROM public.transactions t2
    JOIN public.wallets w ON w.id = t2.wallet_id
    LEFT JOIN public.workspaces ws ON ws.id = w.workspace_id
    LEFT JOIN public.currency_conversions cc
      ON cc.source_currency = t2.currency
      AND cc.target_currency = coalesce(ws.base_currency, 'USD')
      AND cc.date = t2.date
    WHERE t2.currency IS DISTINCT FROM coalesce(ws.base_currency, 'USD')
  ) sub
  WHERE t.id = sub.id
    AND t.base_amount_cents IS NULL;
END;
$$;
