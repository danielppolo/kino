-- Function to backfill historical monthly stats
CREATE OR REPLACE FUNCTION backfill_monthly_stats()
RETURNS void AS $$
DECLARE
  wallet_record RECORD;
  month_start DATE;
  month_end DATE;
  income_cents BIGINT;
  outcome_cents BIGINT;
BEGIN
  -- For each wallet
  FOR wallet_record IN SELECT id FROM wallets LOOP
    -- Get the earliest transaction date for this wallet
    SELECT MIN(date) INTO month_start
    FROM transactions
    WHERE wallet_id = wallet_record.id;

    -- If no transactions, skip this wallet
    IF month_start IS NULL THEN
      CONTINUE;
    END IF;

    -- Set month_start to the start of the month
    month_start := get_month_start(month_start);
    month_end := get_month_start(CURRENT_DATE);

    -- For each month from earliest to current
    WHILE month_start <= month_end LOOP
      -- Calculate income for this month
      SELECT COALESCE(SUM(amount_cents), 0) INTO income_cents
      FROM transactions
      WHERE wallet_id = wallet_record.id
        AND type = 'income'
        AND date >= month_start
        AND date < month_start + INTERVAL '1 month';

      -- Calculate outcome for this month
      SELECT COALESCE(SUM(amount_cents), 0) INTO outcome_cents
      FROM transactions
      WHERE wallet_id = wallet_record.id
        AND type = 'expense'
        AND date >= month_start
        AND date < month_start + INTERVAL '1 month';

      -- Insert or update the monthly stats
      INSERT INTO monthly_stats (
        wallet_id,
        month,
        income_cents,
        outcome_cents,
        net_cents
      )
      VALUES (
        wallet_record.id,
        month_start,
        income_cents,
        outcome_cents,
        income_cents - outcome_cents
      )
      ON CONFLICT (wallet_id, month) 
      DO UPDATE SET 
        income_cents = EXCLUDED.income_cents,
        outcome_cents = EXCLUDED.outcome_cents,
        net_cents = EXCLUDED.net_cents,
        updated_at = now();

      -- Move to next month
      month_start := month_start + INTERVAL '1 month';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute backfill for existing data
SELECT backfill_monthly_stats();
