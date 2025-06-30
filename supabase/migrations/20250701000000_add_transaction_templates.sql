CREATE TABLE public.transaction_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type transaction_type_enum NOT NULL,
  amount_cents integer NULL,
  description text NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  label_id uuid REFERENCES labels(id) ON DELETE SET NULL,
  tags uuid[] NULL,
  currency text NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE POLICY "transaction_templates_policy"
    ON transaction_templates
    FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "transaction_templates_insert_policy"
    ON transaction_templates
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transaction_templates_update_policy"
    ON transaction_templates
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "transaction_templates_delete_policy"
    ON transaction_templates
    FOR DELETE USING ((select auth.uid()) = user_id);
