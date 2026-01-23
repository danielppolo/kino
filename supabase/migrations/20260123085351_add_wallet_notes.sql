-- Add notes column to wallets table
ALTER TABLE public.wallets
ADD COLUMN notes text;
