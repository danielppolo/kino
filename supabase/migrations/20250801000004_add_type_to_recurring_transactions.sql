-- Add type column to recurring_transactions table
-- First add as nullable
ALTER TABLE recurring_transactions 
ADD COLUMN type transaction_type_enum;

-- Backfill the type based on the category type
UPDATE recurring_transactions 
SET type = c.type::transaction_type_enum
FROM categories c
WHERE recurring_transactions.category_id = c.id;

-- Make the column NOT NULL after backfilling
ALTER TABLE recurring_transactions 
ALTER COLUMN type SET NOT NULL;