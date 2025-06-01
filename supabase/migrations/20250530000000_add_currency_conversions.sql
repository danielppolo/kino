-- Create currency_conversions table
CREATE TABLE IF NOT EXISTS currency_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate DECIMAL(20, 10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_currency_pair UNIQUE (source_currency, target_currency)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_currency_conversions_pair 
ON currency_conversions (source_currency, target_currency);

-- Add RLS policies
ALTER TABLE currency_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON currency_conversions
    FOR SELECT
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_currency_conversions_updated_at
    BEFORE UPDATE ON currency_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 