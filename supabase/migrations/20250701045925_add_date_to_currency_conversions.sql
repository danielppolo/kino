-- Add date column to currency_conversions table
ALTER TABLE currency_conversions 
ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_currency_conversions_date 
ON currency_conversions (date);

-- Update the unique constraint to include date
ALTER TABLE currency_conversions 
DROP CONSTRAINT IF EXISTS unique_currency_pair;

ALTER TABLE currency_conversions 
ADD CONSTRAINT unique_currency_pair_date 
UNIQUE (source_currency, target_currency, date);
