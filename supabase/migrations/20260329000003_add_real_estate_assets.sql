CREATE TYPE public.real_estate_asset_type AS ENUM (
  'primary_home',
  'rental_property',
  'land',
  'commercial_property',
  'other_real_estate'
);

CREATE TYPE public.real_estate_asset_status AS ENUM (
  'active',
  'sold',
  'archived'
);

CREATE TABLE public.real_estate_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status public.real_estate_asset_status NOT NULL DEFAULT 'active',
  currency TEXT NOT NULL,
  asset_type public.real_estate_asset_type NOT NULL DEFAULT 'other_real_estate',
  acquired_on DATE NULL,
  origin_transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.real_estate_asset_valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.real_estate_assets(id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL,
  valuation_amount_cents BIGINT NOT NULL CHECK (valuation_amount_cents >= 0),
  valuation_method TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_real_estate_assets_workspace_id
  ON public.real_estate_assets(workspace_id);

CREATE INDEX idx_real_estate_assets_origin_transaction_id
  ON public.real_estate_assets(origin_transaction_id);

CREATE INDEX idx_real_estate_asset_valuations_asset_id_date
  ON public.real_estate_asset_valuations(asset_id, valuation_date DESC, created_at DESC);

CREATE TRIGGER update_real_estate_assets_updated_at
  BEFORE UPDATE ON public.real_estate_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_real_estate_asset_valuations_updated_at
  BEFORE UPDATE ON public.real_estate_asset_valuations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_real_estate_asset_transaction_workspace()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_workspace_id UUID;
BEGIN
  IF NEW.origin_transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w.workspace_id
  INTO transaction_workspace_id
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE t.id = NEW.origin_transaction_id;

  IF transaction_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Origin transaction does not exist';
  END IF;

  IF transaction_workspace_id != NEW.workspace_id THEN
    RAISE EXCEPTION 'Origin transaction must belong to the same workspace';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_real_estate_asset_transaction_workspace
  BEFORE INSERT OR UPDATE ON public.real_estate_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_real_estate_asset_transaction_workspace();

ALTER TABLE public.real_estate_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_asset_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "real_estate_assets_select" ON public.real_estate_assets
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "real_estate_assets_insert" ON public.real_estate_assets
FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

CREATE POLICY "real_estate_assets_update" ON public.real_estate_assets
FOR UPDATE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'editor']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

CREATE POLICY "real_estate_assets_delete" ON public.real_estate_assets
FOR DELETE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'editor']));

CREATE POLICY "real_estate_asset_valuations_select" ON public.real_estate_asset_valuations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.real_estate_assets asset
    WHERE asset.id = real_estate_asset_valuations.asset_id
      AND public.is_workspace_member(asset.workspace_id)
  )
);

CREATE POLICY "real_estate_asset_valuations_insert" ON public.real_estate_asset_valuations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.real_estate_assets asset
    WHERE asset.id = real_estate_asset_valuations.asset_id
      AND public.has_workspace_role(asset.workspace_id, ARRAY['owner', 'editor'])
  )
);

CREATE POLICY "real_estate_asset_valuations_update" ON public.real_estate_asset_valuations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.real_estate_assets asset
    WHERE asset.id = real_estate_asset_valuations.asset_id
      AND public.has_workspace_role(asset.workspace_id, ARRAY['owner', 'editor'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.real_estate_assets asset
    WHERE asset.id = real_estate_asset_valuations.asset_id
      AND public.has_workspace_role(asset.workspace_id, ARRAY['owner', 'editor'])
  )
);

CREATE POLICY "real_estate_asset_valuations_delete" ON public.real_estate_asset_valuations
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.real_estate_assets asset
    WHERE asset.id = real_estate_asset_valuations.asset_id
      AND public.has_workspace_role(asset.workspace_id, ARRAY['owner', 'editor'])
  )
);
