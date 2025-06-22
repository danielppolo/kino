-- Fix foreign key constraints on transactions table to prevent deletion of records with associations
-- Drop existing constraints first, then recreate with proper ON DELETE behavior

-- Drop existing foreign key constraints
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_wallet_id_fkey;

-- Clean up any invalid transfer_id references before adding the constraint
-- Set transfer_id to NULL for any records that reference non-existent transaction IDs
UPDATE public.transactions 
SET transfer_id = NULL 
WHERE transfer_id IS NOT NULL 
AND transfer_id NOT IN (SELECT id FROM public.transactions);

-- Recreate foreign key constraint for category_id with RESTRICT (prevents deletion)
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE RESTRICT;

-- Recreate foreign key constraint for wallet_id with RESTRICT (prevents deletion)
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_wallet_id_fkey 
FOREIGN KEY (wallet_id) 
REFERENCES public.wallets(id) 
ON DELETE RESTRICT;

-- Add foreign key constraint for transfer_id (self-referencing for transfer pairs)
-- This ensures transfer_id references another transaction in the same table
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_transfer_id_fkey 
FOREIGN KEY (transfer_id) 
REFERENCES public.transactions(id) 
ON DELETE CASCADE; 