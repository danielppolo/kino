-- Add color and position columns to wallets table
ALTER TABLE wallets
ADD COLUMN color TEXT,
ADD COLUMN position INTEGER;

-- Update existing wallets with default values
UPDATE wallets
SET color = '#6366F1', -- Default indigo color
    position = 0
WHERE color IS NULL AND position IS NULL;
