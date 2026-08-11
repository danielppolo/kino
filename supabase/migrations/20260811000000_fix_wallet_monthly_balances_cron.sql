-- Ensure the privileged monthly cron can maintain every wallet's snapshots,
-- while preventing clients from invoking the workspace-wide backfill directly.
REVOKE EXECUTE ON FUNCTION public.backfill_wallet_monthly_balances()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_wallet_monthly_balances()
TO service_role;

-- Recalculate both sides of a transaction update. The previous trigger only
-- refreshed NEW.wallet_id/NEW.date, leaving stale balances behind when either
-- the wallet or month changed.
CREATE OR REPLACE FUNCTION public.update_wallet_monthly_balances()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  affected_month date;
  current_balance bigint;
  target_wallet_id uuid;
BEGIN
  -- DELETE and UPDATE must refresh the wallet/month the old row belonged to.
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    affected_month := public.get_month_start(OLD.date);
    target_wallet_id := OLD.wallet_id;

    WHILE affected_month <= public.get_month_start(CURRENT_DATE) LOOP
      SELECT COALESCE(SUM(t.amount_cents), 0)
      INTO current_balance
      FROM public.transactions t
      WHERE t.wallet_id = target_wallet_id
        AND t.date <= affected_month + INTERVAL '1 month' - INTERVAL '1 day';

      INSERT INTO public.wallet_monthly_balances (
        wallet_id,
        month,
        balance_cents
      )
      VALUES (target_wallet_id, affected_month, current_balance)
      ON CONFLICT (wallet_id, month)
      DO UPDATE SET
        balance_cents = EXCLUDED.balance_cents,
        updated_at = now();

      affected_month := affected_month + INTERVAL '1 month';
    END LOOP;
  END IF;

  -- INSERT always needs the new range. UPDATE only needs a second pass when
  -- the transaction moved to a different wallet or month.
  IF TG_OP = 'INSERT' OR (
    TG_OP = 'UPDATE'
    AND (
      NEW.wallet_id IS DISTINCT FROM OLD.wallet_id
      OR public.get_month_start(NEW.date)
        IS DISTINCT FROM public.get_month_start(OLD.date)
    )
  ) THEN
    affected_month := public.get_month_start(NEW.date);
    target_wallet_id := NEW.wallet_id;

    WHILE affected_month <= public.get_month_start(CURRENT_DATE) LOOP
      SELECT COALESCE(SUM(t.amount_cents), 0)
      INTO current_balance
      FROM public.transactions t
      WHERE t.wallet_id = target_wallet_id
        AND t.date <= affected_month + INTERVAL '1 month' - INTERVAL '1 day';

      INSERT INTO public.wallet_monthly_balances (
        wallet_id,
        month,
        balance_cents
      )
      VALUES (target_wallet_id, affected_month, current_balance)
      ON CONFLICT (wallet_id, month)
      DO UPDATE SET
        balance_cents = EXCLUDED.balance_cents,
        updated_at = now();

      affected_month := affected_month + INTERVAL '1 month';
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Repair missing current-month rows and any snapshots made stale by past
-- transaction moves. Migrations run with privileges that bypass table RLS.
SELECT public.backfill_wallet_monthly_balances();
