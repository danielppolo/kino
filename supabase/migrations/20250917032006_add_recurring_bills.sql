-- Add recurring fields to bills table
ALTER TABLE public.bills ADD COLUMN interval_type text NULL;
ALTER TABLE public.bills ADD COLUMN is_recurring boolean DEFAULT false;
ALTER TABLE public.bills ADD COLUMN recurring_bill_id uuid REFERENCES bills(id) ON DELETE SET NULL;

-- Add index for recurring bill queries
CREATE INDEX bills_is_recurring_idx ON bills(is_recurring) WHERE is_recurring = true;
CREATE INDEX bills_recurring_bill_id_idx ON bills(recurring_bill_id);

-- Add comment for documentation
COMMENT ON COLUMN bills.interval_type IS 'Recurrence interval: daily, weekly, monthly, or NULL for one-time bills';
COMMENT ON COLUMN bills.is_recurring IS 'If true, this bill is a recurring template that auto-generates new bill instances';
COMMENT ON COLUMN bills.recurring_bill_id IS 'References the parent recurring bill that generated this instance';

