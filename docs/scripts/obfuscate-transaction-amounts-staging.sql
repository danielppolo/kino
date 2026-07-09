-- =============================================================================
-- Obfuscate transaction amounts (staging / demo only)
-- =============================================================================
-- Permanently overwrites public.transactions.amount_cents (and aligns
-- base_amount_cents). Transfer pairs (same transfer_id, one negative leg and
-- one positive leg) share a single mirrored magnitude so they still net to zero.
--
-- BEFORE RUNNING:
--   1. Use a Supabase STAGING project only. Take a backup or duplicate the project.
--   2. Replace the salt value in the INSERT into obf_salt below.
--   3. Optional dry-run: copy the SELECTs in section "Dry-run previews" and run
--      them alone (no BEGIN/COMMIT).
--   4. Requires privilege to ALTER TABLE … DISABLE TRIGGER USER (SQL editor
--      with sufficient role). DISABLE TRIGGER USER disables every user-defined
--      trigger on public.transactions, including any added after this script was written.
--   5. Run the whole script in one execution so BEGIN/COMMIT wraps all steps.
--   6. Requires digest() from pgcrypto (usually already enabled on Supabase).
--
-- AFTER RUNNING:
--   Bills.* amounts are NOT changed; bill paid totals vs linked transactions may
--   disagree unless you extend this script.
--
-- Triggers on public.transactions (disabled in bulk for this script):
--   transaction_insert, transaction_update, transaction_delete
--   update_monthly_stats_trigger, update_monthly_stats_on_delete_trigger
--   update_monthly_category_stats_trigger, update_monthly_category_stats_on_delete_trigger
--   update_monthly_label_stats_trigger, update_monthly_label_stats_on_delete_trigger
--   update_monthly_balances
--   update_monthly_owed_on_transactions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Salt (edit the literal)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS obf_salt (val text NOT NULL);
TRUNCATE obf_salt;
INSERT INTO obf_salt (val) VALUES ('pzqZUGRtCk1Nuy+PlCxHLjqfVDIpTUKcS0aTfjjLJP0=');

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Dry-run previews (optional): run without the BEGIN…COMMIT block below
-- -----------------------------------------------------------------------------
-- WITH mirrorable AS (
--   SELECT t.transfer_id
--   FROM public.transactions t
--   WHERE t.type = 'transfer' AND t.transfer_id IS NOT NULL
--   GROUP BY t.transfer_id
--   HAVING count(*) = 2
--      AND count(*) FILTER (WHERE t.amount_cents > 0) = 1
--      AND count(*) FILTER (WHERE t.amount_cents < 0) = 1
-- )
-- SELECT 'mirrorable_transfer_count' AS label, count(*) FROM mirrorable;

BEGIN;

CREATE TEMP TABLE _tx_old_amounts ON COMMIT DROP AS
SELECT id, amount_cents AS old_amount_cents, base_amount_cents AS old_base_amount_cents
FROM public.transactions;

ALTER TABLE public.transactions DISABLE TRIGGER USER;

-- ---------------------------------------------------------------------------
-- Pass 1: Valid transfer pairs — one magnitude per transfer_id, mirrored signs
-- ---------------------------------------------------------------------------
WITH mirrorable AS (
  SELECT t.transfer_id
  FROM public.transactions t
  WHERE t.type = 'transfer' AND t.transfer_id IS NOT NULL
  GROUP BY t.transfer_id
  HAVING count(*) = 2
     AND count(*) FILTER (WHERE t.amount_cents > 0) = 1
     AND count(*) FILTER (WHERE t.amount_cents < 0) = 1
),
pair_anchor AS (
  SELECT
    m.transfer_id,
    max(abs(o.old_amount_cents)) AS orig_max
  FROM mirrorable m
  JOIN public.transactions t ON t.transfer_id = m.transfer_id AND t.type = 'transfer'
  JOIN _tx_old_amounts o ON o.id = t.id
  GROUP BY m.transfer_id
),
pair_mult AS (
  SELECT
    p.transfer_id,
    greatest(
      1,
      round(
        p.orig_max::numeric * (
          0.25 + 1.5 * (
            (
              (get_byte(h.d, 0)::bigint << 24)
              | (get_byte(h.d, 1)::bigint << 16)
              | (get_byte(h.d, 2)::bigint << 8)
              | (get_byte(h.d, 3)::bigint)
            )::numeric / 4294967295.0
          )
        )
      )
    )::bigint AS new_abs
  FROM pair_anchor p
  CROSS JOIN LATERAL (
    SELECT digest(p.transfer_id::text || (SELECT val FROM obf_salt), 'sha256') AS d
  ) h
)
UPDATE public.transactions t
SET amount_cents = CASE
  WHEN o.old_amount_cents > 0 THEN pm.new_abs::integer
  WHEN o.old_amount_cents < 0 THEN (-pm.new_abs)::integer
  ELSE 0
END
FROM _tx_old_amounts o
JOIN public.transactions t_src ON t_src.id = o.id
JOIN pair_mult pm ON pm.transfer_id = t_src.transfer_id
WHERE t.id = o.id
  AND t.type = 'transfer'
  AND t.transfer_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Pass 2: All rows not in a mirrorable transfer pair (per-row deterministic)
-- ---------------------------------------------------------------------------
WITH mirrorable AS (
  SELECT t.transfer_id
  FROM public.transactions t
  WHERE t.type = 'transfer' AND t.transfer_id IS NOT NULL
  GROUP BY t.transfer_id
  HAVING count(*) = 2
     AND count(*) FILTER (WHERE t.amount_cents > 0) = 1
     AND count(*) FILTER (WHERE t.amount_cents < 0) = 1
),
mirror_ids AS (
  SELECT tx.id
  FROM public.transactions tx
  INNER JOIN mirrorable m ON m.transfer_id = tx.transfer_id
  WHERE tx.type = 'transfer' AND tx.transfer_id IS NOT NULL
),
calc AS (
  SELECT
    o.id,
    CASE
      WHEN o.old_amount_cents = 0 THEN 0
      ELSE
        (CASE WHEN o.old_amount_cents < 0 THEN -1 ELSE 1 END)
        * greatest(
          1,
          round(
            abs(o.old_amount_cents)::numeric * (
              0.25 + 1.5 * (
                (
                  (get_byte(h.d, 0)::bigint << 24)
                  | (get_byte(h.d, 1)::bigint << 16)
                  | (get_byte(h.d, 2)::bigint << 8)
                  | (get_byte(h.d, 3)::bigint)
                )::numeric / 4294967295.0
              )
            )
          )
        )::integer
    END AS new_amount_cents
  FROM _tx_old_amounts o
  CROSS JOIN LATERAL (
    SELECT digest(o.id::text || (SELECT val FROM obf_salt), 'sha256') AS d
  ) h
  WHERE NOT EXISTS (SELECT 1 FROM mirror_ids mi WHERE mi.id = o.id)
)
UPDATE public.transactions t
SET amount_cents = c.new_amount_cents
FROM calc c
WHERE t.id = c.id;

-- ---------------------------------------------------------------------------
-- Align base_amount_cents with new amount (same FX ratio as before)
-- ---------------------------------------------------------------------------
UPDATE public.transactions t
SET base_amount_cents = CASE
  WHEN o.old_amount_cents IS NULL OR o.old_amount_cents = 0 THEN NULL
  WHEN o.old_base_amount_cents IS NULL THEN NULL
  ELSE round(
    t.amount_cents::numeric * o.old_base_amount_cents::numeric / o.old_amount_cents::numeric
  )::bigint
END
FROM _tx_old_amounts o
WHERE t.id = o.id;

ALTER TABLE public.transactions ENABLE TRIGGER USER;

-- ---------------------------------------------------------------------------
-- Rebuild wallet balances from transactions (matches migration pattern)
-- ---------------------------------------------------------------------------
UPDATE public.wallets w
SET balance_cents = coalesce(
  (SELECT sum(t.amount_cents) FROM public.transactions t WHERE t.wallet_id = w.id),
  0
);

-- ---------------------------------------------------------------------------
-- Rebuild aggregate tables (delete + backfill / insert)
-- ---------------------------------------------------------------------------
DELETE FROM public.monthly_stats;
SELECT public.backfill_monthly_stats_with_transfers();

DELETE FROM public.monthly_category_stats;
INSERT INTO public.monthly_category_stats (
  wallet_id, category_id, month, income_cents, outcome_cents, net_cents, transaction_count
)
SELECT
  wallet_id,
  category_id,
  date_trunc('month', date)::date AS month,
  sum(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS income_cents,
  sum(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS outcome_cents,
  sum(
    CASE
      WHEN type = 'income' THEN amount_cents
      WHEN type = 'expense' THEN -amount_cents
      ELSE 0
    END
  ) AS net_cents,
  count(*)::integer AS transaction_count
FROM public.transactions
WHERE category_id IS NOT NULL
GROUP BY wallet_id, category_id, date_trunc('month', date)::date;

DELETE FROM public.monthly_label_stats;
INSERT INTO public.monthly_label_stats (
  wallet_id, label_id, month, income_cents, outcome_cents, net_cents, transaction_count
)
SELECT
  wallet_id,
  label_id,
  date_trunc('month', date)::date AS month,
  sum(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS income_cents,
  sum(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS outcome_cents,
  sum(
    CASE
      WHEN type = 'income' THEN amount_cents
      WHEN type = 'expense' THEN -amount_cents
      ELSE 0
    END
  ) AS net_cents,
  count(*)::integer AS transaction_count
FROM public.transactions
WHERE label_id IS NOT NULL
GROUP BY wallet_id, label_id, date_trunc('month', date)::date;

DELETE FROM public.wallet_monthly_balances;
SELECT public.backfill_wallet_monthly_balances();

DELETE FROM public.wallet_monthly_owed;
SELECT public.backfill_wallet_monthly_owed();

-- Optional: fill base amounts where null (FX rows). Replace legacy function if
-- staging still has user_preferences.base_currency (removed in workspaces migration).
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

SELECT public.backfill_transaction_base_amounts();

COMMIT;

-- obf_salt is TEMP; dropped when session ends.
