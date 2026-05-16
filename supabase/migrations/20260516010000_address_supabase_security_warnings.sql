-- Address Supabase database linter warnings around mutable search paths,
-- overly-permissive RLS checks, and public RPC execution.

-- ---------------------------------------------------------------------------
-- Pin function search_path values.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  function_name regprocedure;
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.get_transfer_wallet_id(uuid, uuid)',
    'public.get_wallet_members(uuid)',
    'public.get_all_wallet_members(uuid[])',
    'public.insert_wallet_and_user_wallet(text, text)',
    'public.insert_wallet_and_user_wallet(text, text, uuid, public.wallet_type)',
    'public.get_transaction_total_by_currency(uuid, date, date, uuid, uuid, uuid, text, uuid, text, uuid)',
    'public.get_monthly_type_stats(uuid, date, date)',
    'public.get_transaction_size_distribution(uuid, date, date, text)',
    'public.get_tag_cloud_analytics(uuid, date, date)',
    'public.update_wallet_balance()',
    'public.get_currency_exposure(uuid, date, date)',
    'public.validate_real_estate_asset_transaction_workspace()',
    'public.lookup_user_by_email(text)',
    'public.update_wallet_monthly_balances()',
    'public.update_monthly_category_stats_on_delete()',
    'public.update_monthly_label_stats_on_delete()',
    'public.get_cashflow_breakdown(uuid, date, date, uuid, uuid, uuid, text, uuid, text, uuid)',
    'public.get_user_id_by_email(text)',
    'public.set_plaid_ignored_transaction_ids_updated_at()',
    'public.calculate_wallet_owed(uuid)',
    'public.update_wallet_monthly_owed()',
    'public.backfill_transaction_base_amounts()',
    'public.get_transaction_total(uuid, date, date, uuid, uuid, uuid, text, uuid, text, uuid)',
    'public.backfill_wallet_monthly_owed()',
    'public.update_monthly_category_stats()',
    'public.update_monthly_label_stats()',
    'public.set_plaid_transaction_rules_updated_at()',
    'public.get_month_start(date)',
    'public.handle_new_user()',
    'public.update_updated_at_column()',
    'public.backfill_monthly_stats()',
    'public.backfill_monthly_stats_with_transfers()',
    'public.backfill_wallet_monthly_balances()',
    'public.update_monthly_stats()',
    'public.update_monthly_stats_on_delete()'
  ] LOOP
    function_name := to_regprocedure(function_signature);

    IF function_name IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', function_name);
    END IF;
  END LOOP;
END $$;

-- Keep the member lookup RPCs as definer functions because they read
-- auth.users, but constrain them to wallets the caller can already access.
CREATE OR REPLACE FUNCTION public.get_wallet_members(wallet_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  wallet_id UUID,
  role TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uw.id,
    uw.user_id,
    uw.wallet_id,
    uw.role,
    au.email::text,
    uw.created_at
  FROM public.user_wallets uw
  JOIN auth.users au ON uw.user_id = au.id
  WHERE uw.wallet_id = wallet_uuid
    AND EXISTS (
      SELECT 1
      FROM public.user_wallets caller
      WHERE caller.wallet_id = uw.wallet_id
        AND caller.user_id = auth.uid()
    )
  ORDER BY uw.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_wallet_members(wallet_uuids UUID[])
RETURNS TABLE (
  id UUID,
  user_id UUID,
  wallet_id UUID,
  role TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uw.id,
    uw.user_id,
    uw.wallet_id,
    uw.role,
    au.email::text,
    uw.created_at
  FROM public.user_wallets uw
  JOIN auth.users au ON uw.user_id = au.id
  WHERE uw.wallet_id = ANY(wallet_uuids)
    AND EXISTS (
      SELECT 1
      FROM public.user_wallets caller
      WHERE caller.wallet_id = uw.wallet_id
        AND caller.user_id = auth.uid()
    )
  ORDER BY uw.created_at ASC;
END;
$$;

-- These RPCs are safe to run as invokers: table/view RLS constrains the rows
-- they can read or write, while authenticated clients still need RPC access.
DO $$
DECLARE
  function_name regprocedure;
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.get_transfer_wallet_id(uuid, uuid)',
    'public.insert_wallet_and_user_wallet(text, text)',
    'public.insert_wallet_and_user_wallet(text, text, uuid, public.wallet_type)',
    'public.get_transaction_total_by_currency(uuid, date, date, uuid, uuid, uuid, text, uuid, text, uuid)',
    'public.get_monthly_type_stats(uuid, date, date)',
    'public.get_transaction_size_distribution(uuid, date, date, text)',
    'public.get_tag_cloud_analytics(uuid, date, date)',
    'public.get_currency_exposure(uuid, date, date)',
    'public.get_cashflow_breakdown(uuid, date, date, uuid, uuid, uuid, text, uuid, text, uuid)',
    'public.get_transaction_total(uuid, date, date, uuid, uuid, uuid, text, uuid, text, uuid)'
  ] LOOP
    function_name := to_regprocedure(function_signature);

    IF function_name IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', function_name);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', function_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', function_name);
    END IF;
  END LOOP;
END $$;

-- Definer functions that still need elevated privileges should not be callable
-- without a signed-in user. Some remain executable by authenticated users
-- because the app or RLS policies intentionally depend on them.
DO $$
DECLARE
  function_name regprocedure;
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.get_wallet_members(uuid)',
    'public.get_all_wallet_members(uuid[])',
    'public.get_user_id_by_email(text)',
    'public.lookup_user_by_email(text)',
    'public.handle_new_user()',
    'public.has_wallet_role(uuid, text[])',
    'public.has_workspace_role(uuid, text[])',
    'public.is_wallet_member(uuid)',
    'public.is_workspace_member(uuid)',
    'public.wallet_has_no_members(uuid)'
  ] LOOP
    function_name := to_regprocedure(function_signature);

    IF function_name IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', function_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', function_name);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Replace permissive WITH CHECK (true) update policies.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "bill_update" ON public.bills;
CREATE POLICY "bill_update" ON public.bills
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.bills.wallet_id = public.wallets.id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.bills.wallet_id = public.wallets.id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "plaid_ignored_transaction_ids_update" ON public.plaid_ignored_transaction_ids;
CREATE POLICY "plaid_ignored_transaction_ids_update" ON public.plaid_ignored_transaction_ids
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.user_wallets.wallet_id = public.plaid_ignored_transaction_ids.wallet_id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.user_wallets.wallet_id = public.plaid_ignored_transaction_ids.wallet_id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "plaid_transaction_rules_update" ON public.plaid_transaction_rules;
CREATE POLICY "plaid_transaction_rules_update" ON public.plaid_transaction_rules
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.user_wallets.wallet_id = public.plaid_transaction_rules.wallet_id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.user_wallets.wallet_id = public.plaid_transaction_rules.wallet_id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "recurrent_bill_update" ON public.recurrent_bills;
CREATE POLICY "recurrent_bill_update" ON public.recurrent_bills
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.recurrent_bills.wallet_id = public.wallets.id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.recurrent_bills.wallet_id = public.wallets.id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "transaction_update" ON public.transactions;
CREATE POLICY "transaction_update" ON public.transactions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.transactions.wallet_id = public.wallets.id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.wallets
    JOIN public.user_wallets ON public.wallets.id = public.user_wallets.wallet_id
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.transactions.wallet_id = public.wallets.id
      AND public.user_wallets.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "wallet_update" ON public.wallets;
CREATE POLICY "wallet_update" ON public.wallets
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.user_wallets.wallet_id = public.wallets.id
      AND public.user_wallets.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE public.user_wallets.user_id = auth.uid()
      AND public.user_wallets.wallet_id = public.wallets.id
      AND public.user_wallets.role = 'owner'
  )
);

DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;
CREATE POLICY "workspaces_insert" ON public.workspaces
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
