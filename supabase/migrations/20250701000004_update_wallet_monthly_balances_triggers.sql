-- Fix wallet monthly balances trigger function to correctly calculate historical balances
-- instead of using current wallet balance, and add DELETE handling

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS update_monthly_balances ON transactions;

-- Drop the existing function
DROP FUNCTION IF EXISTS update_wallet_monthly_balances();

-- Function to update monthly balances (fixed version)
CREATE OR REPLACE FUNCTION update_wallet_monthly_balances()
RETURNS TRIGGER AS $$
DECLARE
  month_start DATE;
  current_balance BIGINT;
  affected_month DATE;
BEGIN
  -- Determine which month was affected
  IF TG_OP = 'DELETE' THEN
    affected_month := get_month_start(OLD.date);
  ELSE
    affected_month := get_month_start(NEW.date);
  END IF;

  -- Recalculate balance for the affected month and all future months
  -- For each month from the affected month onwards
  WHILE affected_month <= get_month_start(CURRENT_DATE) LOOP
    -- Calculate balance up to the end of this month
    SELECT COALESCE(SUM(amount_cents), 0) INTO current_balance
    FROM transactions
    WHERE wallet_id = COALESCE(NEW.wallet_id, OLD.wallet_id)
      AND date <= affected_month + INTERVAL '1 month' - INTERVAL '1 day';

    -- Insert or update the monthly balance
    INSERT INTO wallet_monthly_balances (wallet_id, month, balance_cents)
    VALUES (COALESCE(NEW.wallet_id, OLD.wallet_id), affected_month, current_balance)
    ON CONFLICT (wallet_id, month) 
    DO UPDATE SET 
      balance_cents = current_balance,
      updated_at = now();

    -- Move to next month
    affected_month := affected_month + INTERVAL '1 month';
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update monthly balances (now includes DELETE)
CREATE TRIGGER update_monthly_balances
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE update_wallet_monthly_balances();

-- Re-run backfill to ensure all existing data is correct
SELECT backfill_wallet_monthly_balances();
