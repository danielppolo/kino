-- Migrate existing recurring bills to recurrent_bills table
INSERT INTO public.recurrent_bills (
  id,
  wallet_id,
  description,
  amount_cents,
  currency,
  interval_type,
  start_date,
  end_date,
  next_due_date,
  created_at
)
SELECT 
  id,
  wallet_id,
  description,
  amount_cents,
  currency,
  interval_type,
  due_date as start_date,
  NULL as end_date,
  due_date as next_due_date,
  created_at
FROM public.bills
WHERE is_recurring = true;

-- Update existing bill instances to set recurrent_bill_id where recurring_bill_id exists
UPDATE public.bills
SET recurrent_bill_id = recurring_bill_id
WHERE recurring_bill_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.recurrent_bills
    WHERE recurrent_bills.id = bills.recurring_bill_id
  );

-- Note: We keep the old columns (is_recurring, interval_type, recurring_bill_id) 
-- temporarily for backward compatibility but they should no longer be used
