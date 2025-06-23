-- Backfill monthly_category_stats with existing transaction data
INSERT INTO monthly_category_stats (wallet_id, category_id, month, income_cents, outcome_cents, net_cents, transaction_count)
SELECT 
    wallet_id,
    category_id,
    date_trunc('month', date) as month,
    SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) as income_cents,
    SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) as outcome_cents,
    SUM(CASE 
        WHEN type = 'income' THEN amount_cents
        WHEN type = 'expense' THEN -amount_cents
        ELSE 0
    END) as net_cents,
    COUNT(*) as transaction_count
FROM transactions
WHERE category_id IS NOT NULL
GROUP BY wallet_id, category_id, date_trunc('month', date)
ON CONFLICT (wallet_id, category_id, month) DO NOTHING;

-- Backfill monthly_label_stats with existing transaction data
INSERT INTO monthly_label_stats (wallet_id, label_id, month, income_cents, outcome_cents, net_cents, transaction_count)
SELECT 
    wallet_id,
    label_id,
    date_trunc('month', date) as month,
    SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) as income_cents,
    SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) as outcome_cents,
    SUM(CASE 
        WHEN type = 'income' THEN amount_cents
        WHEN type = 'expense' THEN -amount_cents
        ELSE 0
    END) as net_cents,
    COUNT(*) as transaction_count
FROM transactions
WHERE label_id IS NOT NULL
GROUP BY wallet_id, label_id, date_trunc('month', date)
ON CONFLICT (wallet_id, label_id, month) DO NOTHING;
