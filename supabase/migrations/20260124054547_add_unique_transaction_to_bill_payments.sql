-- Add unique constraint on transaction_id to prevent one transaction
-- from being linked to multiple bills

-- First, remove duplicate transaction_id entries (keep the oldest one)
DELETE FROM public.bill_payments
WHERE id NOT IN (
  SELECT DISTINCT ON (transaction_id) id
  FROM public.bill_payments
  ORDER BY transaction_id, created_at ASC
);

-- Now add the unique constraint
ALTER TABLE public.bill_payments
  ADD CONSTRAINT bill_payments_transaction_id_unique UNIQUE (transaction_id);
