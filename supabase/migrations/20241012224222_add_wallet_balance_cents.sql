ALTER TABLE wallets
ADD COLUMN balance_cents BIGINT DEFAULT 0;


CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wallets
    SET balance_cents = balance_cents + NEW.amount_cents
    WHERE id = NEW.wallet_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE wallets
    SET balance_cents = balance_cents - OLD.amount_cents + NEW.amount_cents
    WHERE id = NEW.wallet_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wallets
    SET balance_cents = balance_cents - OLD.amount_cents
    WHERE id = OLD.wallet_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE PROCEDURE update_wallet_balance();

CREATE TRIGGER transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE update_wallet_balance();

CREATE TRIGGER transaction_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE update_wallet_balance();