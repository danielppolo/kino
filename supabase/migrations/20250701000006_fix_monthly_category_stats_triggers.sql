-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_monthly_category_stats_trigger ON transactions;
DROP FUNCTION IF EXISTS update_monthly_category_stats();

-- Create improved function to update monthly category stats
CREATE OR REPLACE FUNCTION update_monthly_category_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle UPDATE operations - remove old values first
    IF TG_OP = 'UPDATE' THEN
        -- If old category_id exists and is different from new or old month is different
        IF OLD.category_id IS NOT NULL AND (
            OLD.category_id != NEW.category_id OR 
            date_trunc('month', OLD.date) != date_trunc('month', NEW.date) OR
            OLD.wallet_id != NEW.wallet_id
        ) THEN
            -- Remove from old category's stats
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
        END IF;
    END IF;

    -- Handle INSERT and UPDATE operations - add new values
    IF NEW.category_id IS NOT NULL THEN
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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_monthly_category_stats_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_category_stats(); 