-- Fix wallet balance calculation issue
-- The balance_cents field should only sum transactions, not be affected by bill_payments

-- First, recalculate all wallet balances from scratch based on actual transactions
UPDATE wallets w
SET balance_cents = COALESCE(
  (SELECT SUM(t.amount_cents)
   FROM transactions t
   WHERE t.wallet_id = w.id),
  0
);

-- Verify the triggers are correct (they should already be correct, but let's ensure no duplicates)
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS transaction_insert ON transactions;
DROP TRIGGER IF EXISTS transaction_update ON transactions;
DROP TRIGGER IF EXISTS transaction_delete ON transactions;

-- Drop the function
DROP FUNCTION IF EXISTS update_wallet_balance();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT: add the new amount
  IF TG_OP = 'INSERT' THEN
    UPDATE wallets
    SET balance_cents = balance_cents + NEW.amount_cents
    WHERE id = NEW.wallet_id;
    RETURN NEW;

  -- For UPDATE: subtract old amount and add new amount
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only update if wallet_id or amount_cents changed
    IF OLD.wallet_id != NEW.wallet_id OR OLD.amount_cents != NEW.amount_cents THEN
      -- If wallet changed, update both old and new wallets
      IF OLD.wallet_id != NEW.wallet_id THEN
        UPDATE wallets
        SET balance_cents = balance_cents - OLD.amount_cents
        WHERE id = OLD.wallet_id;

        UPDATE wallets
        SET balance_cents = balance_cents + NEW.amount_cents
        WHERE id = NEW.wallet_id;
      ELSE
        -- Same wallet, just update the difference
        UPDATE wallets
        SET balance_cents = balance_cents - OLD.amount_cents + NEW.amount_cents
        WHERE id = NEW.wallet_id;
      END IF;
    END IF;
    RETURN NEW;

  -- For DELETE: subtract the amount
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wallets
    SET balance_cents = balance_cents - OLD.amount_cents
    WHERE id = OLD.wallet_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers (one per operation to avoid confusion)
CREATE TRIGGER transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

CREATE TRIGGER transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

CREATE TRIGGER transaction_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

-- Add a comment to document this
COMMENT ON FUNCTION update_wallet_balance() IS
'Updates wallet balance_cents based on transaction changes. Only counts transactions, NOT bill_payments.';
