-- Chart Analytics RPCs
-- Replaces full transaction-list table scans with server-side GROUP BY aggregations.
-- Each function returns a compact result set instead of thousands of raw rows.

-- ---------------------------------------------------------------------------
-- get_monthly_type_stats
-- Used by: TransactionTypeDistributionChart
-- Returns one row per (month, wallet, type) instead of all raw transactions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_monthly_type_stats(
  p_wallet_id uuid DEFAULT NULL,
  p_from      date DEFAULT NULL,
  p_to        date DEFAULT NULL
)
RETURNS TABLE (
  month        date,
  wallet_id    uuid,
  type         text,
  amount_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    DATE_TRUNC('month', t.date)::date AS month,
    t.wallet_id,
    t.type,
    SUM(ABS(t.amount_cents))          AS amount_cents
  FROM transactions t
  JOIN wallets w ON w.id = t.wallet_id
  WHERE
    (p_wallet_id IS NULL OR t.wallet_id = p_wallet_id)
    AND (p_from IS NULL OR t.date >= p_from)
    AND (p_to   IS NULL OR t.date <= p_to)
  GROUP BY DATE_TRUNC('month', t.date)::date, t.wallet_id, t.type
  ORDER BY month;
$$;

-- ---------------------------------------------------------------------------
-- get_transaction_size_distribution
-- Used by: TransactionSizeDistributionChart
-- Returns exactly 6 rows (one per size bucket) regardless of transaction count.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_transaction_size_distribution(
  p_wallet_id uuid DEFAULT NULL,
  p_from      date DEFAULT NULL,
  p_to        date DEFAULT NULL,
  p_type      text DEFAULT NULL
)
RETURNS TABLE (
  range              text,
  sort_order         int,
  transaction_count  bigint,
  total_amount_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    CASE
      WHEN ABS(t.amount_cents) <    1000 THEN '$0-$10'
      WHEN ABS(t.amount_cents) <    5000 THEN '$10-$50'
      WHEN ABS(t.amount_cents) <   10000 THEN '$50-$100'
      WHEN ABS(t.amount_cents) <   50000 THEN '$100-$500'
      WHEN ABS(t.amount_cents) <  100000 THEN '$500-$1000'
      ELSE '$1000+'
    END                        AS range,
    CASE
      WHEN ABS(t.amount_cents) <    1000 THEN 1
      WHEN ABS(t.amount_cents) <    5000 THEN 2
      WHEN ABS(t.amount_cents) <   10000 THEN 3
      WHEN ABS(t.amount_cents) <   50000 THEN 4
      WHEN ABS(t.amount_cents) <  100000 THEN 5
      ELSE 6
    END                        AS sort_order,
    COUNT(*)                   AS transaction_count,
    SUM(ABS(t.amount_cents))   AS total_amount_cents
  FROM transactions t
  JOIN wallets w ON w.id = t.wallet_id
  WHERE
    (p_wallet_id IS NULL OR t.wallet_id = p_wallet_id)
    AND (p_from IS NULL OR t.date >= p_from)
    AND (p_to   IS NULL OR t.date <= p_to)
    AND (p_type IS NULL OR t.type = p_type::transaction_type_enum)
  GROUP BY range, sort_order
  ORDER BY sort_order;
$$;

-- ---------------------------------------------------------------------------
-- get_tag_cloud_analytics
-- Used by: TagCloudAnalyticsChart
-- Returns one row per distinct tag instead of all raw transactions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_tag_cloud_analytics(
  p_wallet_id uuid DEFAULT NULL,
  p_from      date DEFAULT NULL,
  p_to        date DEFAULT NULL
)
RETURNS TABLE (
  tag_id             uuid,
  tag_title          text,
  transaction_count  bigint,
  total_amount_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    tt.tag_id,
    tg.title                   AS tag_title,
    COUNT(*)                   AS transaction_count,
    SUM(ABS(tr.amount_cents))  AS total_amount_cents
  FROM transaction_tags tt
  JOIN transactions tr ON tr.id = tt.transaction_id
  JOIN tags         tg ON tg.id = tt.tag_id
  JOIN wallets       w ON  w.id = tr.wallet_id
  WHERE
    (p_wallet_id IS NULL OR tr.wallet_id = p_wallet_id)
    AND (p_from IS NULL OR tr.date >= p_from)
    AND (p_to   IS NULL OR tr.date <= p_to)
  GROUP BY tt.tag_id, tg.title
  ORDER BY transaction_count DESC;
$$;

-- ---------------------------------------------------------------------------
-- get_currency_exposure
-- Used by: CurrencyExposureChart
-- Returns one row per distinct currency (typically < 10 rows).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_currency_exposure(
  p_wallet_id uuid DEFAULT NULL,
  p_from      date DEFAULT NULL,
  p_to        date DEFAULT NULL
)
RETURNS TABLE (
  currency           text,
  transaction_count  bigint,
  total_amount_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(t.currency, 'USD') AS currency,
    COUNT(*)                    AS transaction_count,
    SUM(ABS(t.amount_cents))    AS total_amount_cents
  FROM transactions t
  JOIN wallets w ON w.id = t.wallet_id
  WHERE
    (p_wallet_id IS NULL OR t.wallet_id = p_wallet_id)
    AND (p_from IS NULL OR t.date >= p_from)
    AND (p_to   IS NULL OR t.date <= p_to)
  GROUP BY COALESCE(t.currency, 'USD')
  ORDER BY total_amount_cents DESC;
$$;
