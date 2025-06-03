-- Create monthly_stats table
CREATE TABLE IF NOT EXISTS monthly_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    income_cents BIGINT NOT NULL DEFAULT 0,
    outcome_cents BIGINT NOT NULL DEFAULT 0,
    net_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(wallet_id, month)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS monthly_stats_wallet_month_idx ON monthly_stats(wallet_id, month);

-- Create function to update monthly stats
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert monthly stats for the transaction's month
    INSERT INTO monthly_stats (wallet_id, month, income_cents, outcome_cents, net_cents)
    VALUES (
        NEW.wallet_id,
        date_trunc('month', NEW.date),
        CASE WHEN NEW.type = 'income' THEN NEW.amount_cents ELSE 0 END,
        CASE WHEN NEW.type = 'expense' THEN NEW.amount_cents ELSE 0 END,
        CASE 
            WHEN NEW.type = 'income' THEN NEW.amount_cents
            WHEN NEW.type = 'expense' THEN -NEW.amount_cents
            ELSE 0
        END
    )
    ON CONFLICT (wallet_id, month) DO UPDATE
    SET
        income_cents = monthly_stats.income_cents + 
            CASE WHEN NEW.type = 'income' THEN NEW.amount_cents ELSE 0 END,
        outcome_cents = monthly_stats.outcome_cents + 
            CASE WHEN NEW.type = 'expense' THEN NEW.amount_cents ELSE 0 END,
        net_cents = monthly_stats.net_cents + 
            CASE 
                WHEN NEW.type = 'income' THEN NEW.amount_cents
                WHEN NEW.type = 'expense' THEN -NEW.amount_cents
                ELSE 0
            END,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update monthly stats on transaction insert/update
CREATE TRIGGER update_monthly_stats_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_stats();

-- Create trigger to update monthly stats on transaction delete
CREATE OR REPLACE FUNCTION update_monthly_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update monthly stats for the deleted transaction's month
    UPDATE monthly_stats
    SET
        income_cents = income_cents - 
            CASE WHEN OLD.type = 'income' THEN OLD.amount_cents ELSE 0 END,
        outcome_cents = outcome_cents - 
            CASE WHEN OLD.type = 'expense' THEN OLD.amount_cents ELSE 0 END,
        net_cents = net_cents - 
            CASE 
                WHEN OLD.type = 'income' THEN OLD.amount_cents
                WHEN OLD.type = 'expense' THEN -OLD.amount_cents
                ELSE 0
            END,
        updated_at = timezone('utc'::text, now())
    WHERE wallet_id = OLD.wallet_id AND month = date_trunc('month', OLD.date);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_stats_on_delete_trigger
    AFTER DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_stats_on_delete(); 