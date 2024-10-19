ALTER TABLE transactions
ALTER COLUMN user_id SET DEFAULT auth.uid();