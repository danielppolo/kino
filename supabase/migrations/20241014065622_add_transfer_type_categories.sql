-- Add 'transfer' to the allowed types in the categories table and allow null in user_id
ALTER TABLE public.categories
DROP CONSTRAINT categories_type_check,
ADD CONSTRAINT categories_type_check CHECK (
  type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text])
);

-- Allow null in user_id reference
ALTER TABLE public.categories
ALTER COLUMN user_id DROP NOT NULL,
ALTER COLUMN user_id DROP DEFAULT;

-- Update the foreign key constraint to allow null values
ALTER TABLE public.categories
DROP CONSTRAINT categories_user_id_fkey,
ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
