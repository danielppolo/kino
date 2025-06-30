-- Add unique constraint on user_id, name, and type for categories
-- This allows users to have categories with the same name but different types
-- and also allows the same name across different users
ALTER TABLE public.categories
ADD CONSTRAINT categories_user_id_name_type_unique 
UNIQUE (user_id, name, type);
