-- Modify the category_id column in the transactions table to allow NULL values
ALTER TABLE public.transactions
ALTER COLUMN category_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_category_id_fkey,
ADD CONSTRAINT transactions_category_id_fkey
    FOREIGN KEY (category_id)
    REFERENCES public.categories(id)
    ON DELETE SET NULL;
