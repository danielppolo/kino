-- Add transfer_id column to public.transactions
ALTER TABLE public.transactions
ADD COLUMN transfer_id UUID NULL;

-- Add an index to improve query performance
CREATE INDEX idx_transactions_transfer_id ON public.transactions (transfer_id);
