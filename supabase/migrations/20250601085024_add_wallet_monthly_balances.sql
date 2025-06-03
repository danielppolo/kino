-- Create table for storing monthly balances
CREATE TABLE wallet_monthly_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_id, month)
);

-- Create index for faster lookups
CREATE INDEX idx_wallet_monthly_balances_wallet_month 
ON wallet_monthly_balances(wallet_id, month);

-- Function to get the start of the month
CREATE OR REPLACE FUNCTION get_month_start(date_value DATE)
RETURNS DATE AS $$
BEGIN
  RETURN date_trunc('month', date_value)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update monthly balances
CREATE OR REPLACE FUNCTION update_wallet_monthly_balances()
RETURNS TRIGGER AS $$
DECLARE
  month_start DATE;
  current_balance BIGINT;
BEGIN
  -- Get the month start for the transaction date
  month_start := get_month_start(NEW.date);
  
  -- Get current balance for the wallet
  SELECT balance_cents INTO current_balance
  FROM wallets
  WHERE id = NEW.wallet_id;

  -- Insert or update the monthly balance
  INSERT INTO wallet_monthly_balances (wallet_id, month, balance_cents)
  VALUES (NEW.wallet_id, month_start, current_balance)
  ON CONFLICT (wallet_id, month) 
  DO UPDATE SET 
    balance_cents = current_balance,
    updated_at = now();

  -- Update all future months
  UPDATE wallet_monthly_balances
  SET 
    balance_cents = current_balance,
    updated_at = now()
  WHERE wallet_id = NEW.wallet_id 
    AND month > month_start;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update monthly balances
CREATE TRIGGER update_monthly_balances
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE update_wallet_monthly_balances();

-- Function to backfill historical balances
CREATE OR REPLACE FUNCTION backfill_wallet_monthly_balances()
RETURNS void AS $$
DECLARE
  wallet_record RECORD;
  month_start DATE;
  month_end DATE;
  current_balance BIGINT;
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
      -- Calculate balance up to this month
      SELECT COALESCE(SUM(amount_cents), 0) INTO current_balance
      FROM transactions
      WHERE wallet_id = wallet_record.id
        AND date <= month_start + INTERVAL '1 month' - INTERVAL '1 day';

      -- Insert or update the monthly balance
      INSERT INTO wallet_monthly_balances (wallet_id, month, balance_cents)
      VALUES (wallet_record.id, month_start, current_balance)
      ON CONFLICT (wallet_id, month) 
      DO UPDATE SET 
        balance_cents = current_balance,
        updated_at = now();

      -- Move to next month
      month_start := month_start + INTERVAL '1 month';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute backfill for existing data
SELECT backfill_wallet_monthly_balances(); 