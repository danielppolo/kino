-- Create monthly_category_stats table
CREATE TABLE IF NOT EXISTS monthly_category_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    income_cents BIGINT NOT NULL DEFAULT 0,
    outcome_cents BIGINT NOT NULL DEFAULT 0,
    net_cents BIGINT NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(wallet_id, category_id, month)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS monthly_category_stats_wallet_month_idx ON monthly_category_stats(wallet_id, month);
CREATE INDEX IF NOT EXISTS monthly_category_stats_category_idx ON monthly_category_stats(category_id);
CREATE INDEX IF NOT EXISTS monthly_category_stats_wallet_category_idx ON monthly_category_stats(wallet_id, category_id);

-- Create function to update monthly category stats
CREATE OR REPLACE FUNCTION update_monthly_category_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert monthly category stats for the transaction's month
    INSERT INTO monthly_category_stats (wallet_id, category_id, month, income_cents, outcome_cents, net_cents, transaction_count)
    VALUES (
        NEW.wallet_id,
        NEW.category_id,
        date_trunc('month', NEW.date),
        CASE WHEN NEW.type = 'income' THEN NEW.amount_cents ELSE 0 END,
        CASE WHEN NEW.type = 'expense' THEN NEW.amount_cents ELSE 0 END,
        CASE 
            WHEN NEW.type = 'income' THEN NEW.amount_cents
            WHEN NEW.type = 'expense' THEN -NEW.amount_cents
            ELSE 0
        END,
        1
    )
    ON CONFLICT (wallet_id, category_id, month) DO UPDATE
    SET
        income_cents = monthly_category_stats.income_cents + 
            CASE WHEN NEW.type = 'income' THEN NEW.amount_cents ELSE 0 END,
        outcome_cents = monthly_category_stats.outcome_cents + 
            CASE WHEN NEW.type = 'expense' THEN NEW.amount_cents ELSE 0 END,
        net_cents = monthly_category_stats.net_cents + 
            CASE 
                WHEN NEW.type = 'income' THEN NEW.amount_cents
                WHEN NEW.type = 'expense' THEN -NEW.amount_cents
                ELSE 0
            END,
        transaction_count = monthly_category_stats.transaction_count + 1,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update monthly category stats on transaction insert/update
CREATE TRIGGER update_monthly_category_stats_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_category_stats();

-- Create function to update monthly category stats on transaction delete
CREATE OR REPLACE FUNCTION update_monthly_category_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update monthly category stats for the deleted transaction's month
    UPDATE monthly_category_stats
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
        transaction_count = transaction_count - 1,
        updated_at = timezone('utc'::text, now())
    WHERE wallet_id = OLD.wallet_id 
        AND category_id = OLD.category_id 
        AND month = date_trunc('month', OLD.date);

    -- Delete the record if transaction_count becomes 0
    DELETE FROM monthly_category_stats
    WHERE wallet_id = OLD.wallet_id 
        AND category_id = OLD.category_id 
        AND month = date_trunc('month', OLD.date)
        AND transaction_count = 0;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_category_stats_on_delete_trigger
    AFTER DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_category_stats_on_delete();
