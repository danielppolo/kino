-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_monthly_label_stats_trigger ON transactions;
DROP FUNCTION IF EXISTS update_monthly_label_stats();

-- Create improved function to update monthly label stats
CREATE OR REPLACE FUNCTION update_monthly_label_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle UPDATE operations - remove old values first
    IF TG_OP = 'UPDATE' THEN
        -- If old label_id exists and is different from new or old month is different
        IF OLD.label_id IS NOT NULL AND (
            OLD.label_id != NEW.label_id OR 
            date_trunc('month', OLD.date) != date_trunc('month', NEW.date) OR
            OLD.wallet_id != NEW.wallet_id
        ) THEN
            -- Remove from old label's stats
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
    END IF;

    -- Handle INSERT and UPDATE operations - add new values
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

-- Recreate the trigger
CREATE TRIGGER update_monthly_label_stats_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_label_stats(); 