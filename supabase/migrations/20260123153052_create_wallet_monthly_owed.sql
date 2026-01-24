-- Create wallet_monthly_owed table for tracking historical owed amounts
CREATE TABLE wallet_monthly_owed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  owed_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_id, month)
);

CREATE INDEX idx_wallet_monthly_owed_wallet_month
ON wallet_monthly_owed(wallet_id, month);

-- Helper function: Calculate current owed amount for a wallet
CREATE OR REPLACE FUNCTION calculate_wallet_owed(p_wallet_id UUID)
RETURNS BIGINT AS $$
DECLARE
  total_owed BIGINT;
BEGIN
  SELECT COALESCE(SUM(
    GREATEST(0, b.amount_cents - COALESCE(
      (SELECT SUM(ABS(t.amount_cents))
       FROM bill_payments bp
       JOIN transactions t ON bp.transaction_id = t.id
       WHERE bp.bill_id = b.id), 0
    ))
  ), 0)
  INTO total_owed
  FROM bills b
  WHERE b.wallet_id = p_wallet_id;

  RETURN total_owed;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: Update all months with current owed amount
CREATE OR REPLACE FUNCTION update_wallet_monthly_owed()
RETURNS TRIGGER AS $$
DECLARE
  affected_wallet_id UUID;
  current_owed BIGINT;
  earliest_month DATE;
  month_cursor DATE;
BEGIN
  -- Determine affected wallet_id based on table
  IF TG_TABLE_NAME = 'bills' THEN
    affected_wallet_id := COALESCE(NEW.wallet_id, OLD.wallet_id);
  ELSIF TG_TABLE_NAME = 'bill_payments' THEN
    SELECT wallet_id INTO affected_wallet_id
    FROM bills WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    -- Only update if transaction is linked to a bill
    SELECT b.wallet_id INTO affected_wallet_id
    FROM bills b
    JOIN bill_payments bp ON b.id = bp.bill_id
    WHERE bp.transaction_id = COALESCE(NEW.id, OLD.id)
    LIMIT 1;

    IF affected_wallet_id IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  -- Calculate current owed amount
  current_owed := calculate_wallet_owed(affected_wallet_id);

  -- Find earliest transaction month for this wallet
  SELECT COALESCE(
    (SELECT date_trunc('month', MIN(date))::DATE
     FROM transactions WHERE wallet_id = affected_wallet_id),
    date_trunc('month', CURRENT_DATE)::DATE
  ) INTO earliest_month;

  -- Update ALL months from earliest to 12 months in future
  month_cursor := earliest_month;
  WHILE month_cursor <= date_trunc('month', CURRENT_DATE + INTERVAL '12 months')::DATE LOOP
    INSERT INTO wallet_monthly_owed (wallet_id, month, owed_cents)
    VALUES (affected_wallet_id, month_cursor, current_owed)
    ON CONFLICT (wallet_id, month)
    DO UPDATE SET
      owed_cents = current_owed,
      updated_at = now();

    month_cursor := month_cursor + INTERVAL '1 month';
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on relevant tables
CREATE TRIGGER update_monthly_owed_on_bills
AFTER INSERT OR UPDATE OR DELETE ON bills
FOR EACH ROW EXECUTE PROCEDURE update_wallet_monthly_owed();

CREATE TRIGGER update_monthly_owed_on_payments
AFTER INSERT OR UPDATE OR DELETE ON bill_payments
FOR EACH ROW EXECUTE PROCEDURE update_wallet_monthly_owed();

CREATE TRIGGER update_monthly_owed_on_transactions
AFTER UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE PROCEDURE update_wallet_monthly_owed();

-- Backfill function: Initialize data for existing wallets
CREATE OR REPLACE FUNCTION backfill_wallet_monthly_owed()
RETURNS void AS $$
DECLARE
  wallet_record RECORD;
  current_owed BIGINT;
  earliest_month DATE;
  month_cursor DATE;
BEGIN
  FOR wallet_record IN SELECT id FROM wallets LOOP
    current_owed := calculate_wallet_owed(wallet_record.id);

    -- Find earliest transaction month
    SELECT COALESCE(
      (SELECT date_trunc('month', MIN(date))::DATE
       FROM transactions WHERE wallet_id = wallet_record.id),
      date_trunc('month', CURRENT_DATE)::DATE
    ) INTO earliest_month;

    month_cursor := earliest_month;
    WHILE month_cursor <= date_trunc('month', CURRENT_DATE + INTERVAL '12 months')::DATE LOOP
      INSERT INTO wallet_monthly_owed (wallet_id, month, owed_cents)
      VALUES (wallet_record.id, month_cursor, current_owed)
      ON CONFLICT (wallet_id, month) DO UPDATE SET
        owed_cents = current_owed,
        updated_at = now();

      month_cursor := month_cursor + INTERVAL '1 month';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run backfill
SELECT backfill_wallet_monthly_owed();
