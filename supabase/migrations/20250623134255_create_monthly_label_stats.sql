-- Create monthly_label_stats table
CREATE TABLE IF NOT EXISTS monthly_label_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    income_cents BIGINT NOT NULL DEFAULT 0,
    outcome_cents BIGINT NOT NULL DEFAULT 0,
    net_cents BIGINT NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(wallet_id, label_id, month)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS monthly_label_stats_wallet_month_idx ON monthly_label_stats(wallet_id, month);
CREATE INDEX IF NOT EXISTS monthly_label_stats_label_idx ON monthly_label_stats(label_id);
CREATE INDEX IF NOT EXISTS monthly_label_stats_wallet_label_idx ON monthly_label_stats(wallet_id, label_id);

-- Create function to update monthly label stats
CREATE OR REPLACE FUNCTION update_monthly_label_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if label_id is not null
    IF NEW.label_id IS NOT NULL THEN
        -- Update or insert monthly label stats for the transaction's month
        INSERT INTO monthly_label_stats (wallet_id, label_id, month, income_cents, outcome_cents, net_cents, transaction_count)
        VALUES (
            NEW.wallet_id,
            NEW.label_id,
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
        ON CONFLICT (wallet_id, label_id, month) DO UPDATE
        SET
            income_cents = monthly_label_stats.income_cents + 
                CASE WHEN NEW.type = 'income' THEN NEW.amount_cents ELSE 0 END,
            outcome_cents = monthly_label_stats.outcome_cents + 
                CASE WHEN NEW.type = 'expense' THEN NEW.amount_cents ELSE 0 END,
            net_cents = monthly_label_stats.net_cents + 
                CASE 
                    WHEN NEW.type = 'income' THEN NEW.amount_cents
                    WHEN NEW.type = 'expense' THEN -NEW.amount_cents
                    ELSE 0
                END,
            transaction_count = monthly_label_stats.transaction_count + 1,
            updated_at = timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update monthly label stats on transaction insert/update
CREATE TRIGGER update_monthly_label_stats_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_label_stats();

-- Create function to update monthly label stats on transaction delete
CREATE OR REPLACE FUNCTION update_monthly_label_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if label_id is not null
    IF OLD.label_id IS NOT NULL THEN
        -- Update monthly label stats for the deleted transaction's month
        UPDATE monthly_label_stats
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
            AND label_id = OLD.label_id 
            AND month = date_trunc('month', OLD.date);

        -- Delete the record if transaction_count becomes 0
        DELETE FROM monthly_label_stats
        WHERE wallet_id = OLD.wallet_id 
            AND label_id = OLD.label_id 
            AND month = date_trunc('month', OLD.date)
            AND transaction_count = 0;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_label_stats_on_delete_trigger
    AFTER DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_label_stats_on_delete();
