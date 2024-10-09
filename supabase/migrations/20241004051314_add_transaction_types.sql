DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
    CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense', 'transfer');
  END IF;
END $$;

ALTER TABLE transactions
ADD COLUMN type transaction_type_enum NOT NULL;