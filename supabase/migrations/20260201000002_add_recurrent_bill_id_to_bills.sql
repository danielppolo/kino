-- Add recurrent_bill_id column to bills table
ALTER TABLE public.bills ADD COLUMN recurrent_bill_id uuid REFERENCES recurrent_bills(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX bills_recurrent_bill_id_idx ON bills(recurrent_bill_id);

-- Add comment for documentation
COMMENT ON COLUMN bills.recurrent_bill_id IS 'References the parent recurrent bill that generated this instance';
