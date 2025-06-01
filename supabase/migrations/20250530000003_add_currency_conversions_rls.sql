-- Enable RLS
ALTER TABLE currency_conversions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage currency conversions
CREATE POLICY "Service role can manage currency conversions"
ON currency_conversions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to read currency conversions
CREATE POLICY "Authenticated users can read currency conversions"
ON currency_conversions
FOR SELECT
TO authenticated
USING (true); 