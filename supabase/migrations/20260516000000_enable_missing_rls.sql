-- Enable RLS on public tables flagged by the Supabase linter.
-- Existing policy gaps are filled with wallet/workspace scoped policies.

CREATE OR REPLACE FUNCTION public.is_wallet_member(wallet_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE user_wallets.wallet_id = wallet_uuid
      AND user_wallets.user_id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_wallet_role(wallet_uuid UUID, required_role TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE user_wallets.wallet_id = wallet_uuid
      AND user_wallets.user_id = (SELECT auth.uid())
      AND user_wallets.role = ANY(required_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.wallet_has_no_members(wallet_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE user_wallets.wallet_id = wallet_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.currency_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_monthly_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_label_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_category_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_monthly_owed ENABLE ROW LEVEL SECURITY;

-- Avoid recursive self-queries once RLS is enabled on user_wallets.
DROP POLICY IF EXISTS "user_wallets_select" ON public.user_wallets;
DROP POLICY IF EXISTS "user_wallets_insert" ON public.user_wallets;
DROP POLICY IF EXISTS "user_wallets_update" ON public.user_wallets;
DROP POLICY IF EXISTS "user_wallets_delete" ON public.user_wallets;

CREATE POLICY "user_wallets_select" ON public.user_wallets
FOR SELECT TO authenticated
USING (public.is_wallet_member(wallet_id));

CREATE POLICY "user_wallets_insert" ON public.user_wallets
FOR INSERT TO authenticated
WITH CHECK (
  public.has_wallet_role(wallet_id, ARRAY['owner'])
  OR public.wallet_has_no_members(wallet_id)
);

CREATE POLICY "user_wallets_update" ON public.user_wallets
FOR UPDATE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner']))
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner']));

CREATE POLICY "user_wallets_delete" ON public.user_wallets
FOR DELETE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner']));

-- Recurring transactions mirror regular transaction access:
-- wallet members can read, owners/editors can write.
CREATE POLICY "recurring_transactions_select" ON public.recurring_transactions
FOR SELECT TO authenticated
USING (public.is_wallet_member(wallet_id));

CREATE POLICY "recurring_transactions_insert" ON public.recurring_transactions
FOR INSERT TO authenticated
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "recurring_transactions_update" ON public.recurring_transactions
FOR UPDATE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']))
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "recurring_transactions_delete" ON public.recurring_transactions
FOR DELETE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

-- Derived wallet analytics are readable by wallet members and maintained by
-- transaction/bill triggers for owners and editors.
CREATE POLICY "wallet_monthly_balances_select" ON public.wallet_monthly_balances
FOR SELECT TO authenticated
USING (public.is_wallet_member(wallet_id));

CREATE POLICY "wallet_monthly_balances_insert" ON public.wallet_monthly_balances
FOR INSERT TO authenticated
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "wallet_monthly_balances_update" ON public.wallet_monthly_balances
FOR UPDATE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']))
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "wallet_monthly_balances_delete" ON public.wallet_monthly_balances
FOR DELETE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_stats_select" ON public.monthly_stats
FOR SELECT TO authenticated
USING (public.is_wallet_member(wallet_id));

CREATE POLICY "monthly_stats_insert" ON public.monthly_stats
FOR INSERT TO authenticated
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_stats_update" ON public.monthly_stats
FOR UPDATE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']))
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_stats_delete" ON public.monthly_stats
FOR DELETE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_category_stats_select" ON public.monthly_category_stats
FOR SELECT TO authenticated
USING (public.is_wallet_member(wallet_id));

CREATE POLICY "monthly_category_stats_insert" ON public.monthly_category_stats
FOR INSERT TO authenticated
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_category_stats_update" ON public.monthly_category_stats
FOR UPDATE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']))
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_category_stats_delete" ON public.monthly_category_stats
FOR DELETE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_label_stats_select" ON public.monthly_label_stats
FOR SELECT TO authenticated
USING (public.is_wallet_member(wallet_id));

CREATE POLICY "monthly_label_stats_insert" ON public.monthly_label_stats
FOR INSERT TO authenticated
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_label_stats_update" ON public.monthly_label_stats
FOR UPDATE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']))
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "monthly_label_stats_delete" ON public.monthly_label_stats
FOR DELETE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "wallet_monthly_owed_select" ON public.wallet_monthly_owed
FOR SELECT TO authenticated
USING (public.is_wallet_member(wallet_id));

CREATE POLICY "wallet_monthly_owed_insert" ON public.wallet_monthly_owed
FOR INSERT TO authenticated
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "wallet_monthly_owed_update" ON public.wallet_monthly_owed
FOR UPDATE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']))
WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));

CREATE POLICY "wallet_monthly_owed_delete" ON public.wallet_monthly_owed
FOR DELETE TO authenticated
USING (public.has_wallet_role(wallet_id, ARRAY['owner', 'editor']));
