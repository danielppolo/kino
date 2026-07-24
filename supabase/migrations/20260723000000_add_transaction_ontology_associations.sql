create table public.ontology_entities (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ontology_id text not null,
  source_object_id text not null,
  entity_type text not null check (
    entity_type in ('person', 'place', 'organization', 'trip')
  ),
  canonical_name text not null,
  subtitle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, entity_type, ontology_id),
  unique (workspace_id, source_object_id),
  unique (id, entity_type)
);

create table public.transaction_ontology_associations (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  ontology_entity_id uuid not null,
  entity_type text not null check (
    entity_type in ('person', 'place', 'organization', 'trip')
  ),
  created_at timestamptz not null default now(),
  primary key (transaction_id, ontology_entity_id),
  foreign key (ontology_entity_id, entity_type)
    references public.ontology_entities(id, entity_type)
    on delete restrict
);

create unique index transaction_ontology_singleton_type_key
  on public.transaction_ontology_associations (transaction_id, entity_type)
  where entity_type in ('place', 'organization', 'trip');

create index transaction_ontology_associations_entity_idx
  on public.transaction_ontology_associations (ontology_entity_id, transaction_id);

alter table public.ontology_entities enable row level security;
alter table public.transaction_ontology_associations enable row level security;

create policy "ontology_entities_select"
on public.ontology_entities
for select to authenticated
using (is_workspace_member(workspace_id));

create policy "ontology_entities_insert"
on public.ontology_entities
for insert to authenticated
with check (
  has_workspace_role(workspace_id, array['owner', 'editor'])
  and coalesce(
    (
      select (w.feature_flags ->> 'ontology_associations_enabled')::boolean
      from public.workspaces w
      where w.id = workspace_id
    ),
    false
  )
);

create policy "ontology_entities_update"
on public.ontology_entities
for update to authenticated
using (has_workspace_role(workspace_id, array['owner', 'editor']))
with check (has_workspace_role(workspace_id, array['owner', 'editor']));

create policy "ontology_entities_delete"
on public.ontology_entities
for delete to authenticated
using (has_workspace_role(workspace_id, array['owner', 'editor']));

create policy "transaction_ontology_associations_select"
on public.transaction_ontology_associations
for select to authenticated
using (
  exists (
    select 1
    from public.transactions t
    join public.user_wallets uw on uw.wallet_id = t.wallet_id
    where t.id = transaction_id
      and uw.user_id = auth.uid()
  )
);

create policy "transaction_ontology_associations_insert"
on public.transaction_ontology_associations
for insert to authenticated
with check (
  exists (
    select 1
    from public.transactions t
    join public.wallets w on w.id = t.wallet_id
    join public.user_wallets uw on uw.wallet_id = t.wallet_id
    join public.ontology_entities oe on oe.id = ontology_entity_id
    where t.id = transaction_id
      and uw.user_id = auth.uid()
      and uw.role in ('owner', 'editor')
      and oe.workspace_id = w.workspace_id
      and oe.entity_type = entity_type
      and coalesce(
        (
          select (ws.feature_flags ->> 'ontology_associations_enabled')::boolean
          from public.workspaces ws
          where ws.id = w.workspace_id
        ),
        false
      )
  )
);

create policy "transaction_ontology_associations_delete"
on public.transaction_ontology_associations
for delete to authenticated
using (
  exists (
    select 1
    from public.transactions t
    join public.user_wallets uw on uw.wallet_id = t.wallet_id
    where t.id = transaction_id
      and uw.user_id = auth.uid()
      and uw.role in ('owner', 'editor')
  )
);

drop view if exists public.transaction_list;

create view public.transaction_list
with (security_invoker = on)
as
select
  t.id,
  t.created_at,
  t.description,
  t.amount_cents,
  t.base_amount_cents,
  t.date,
  t.currency,
  t.type,
  t.wallet_id,
  t.category_id,
  t.label_id,
  t.transfer_id,
  t.note,
  t.plaid_transaction_id,
  t.plaid_pending_transaction_id,
  t.plaid_merchant_name,
  t.plaid_merchant_key,
  t.plaid_personal_finance_category_primary,
  case
    when t.type in ('income', 'expense')
      and (t.category_id is null or t.label_id is null)
    then true
    else false
  end as needs_review,
  array_remove(array_agg(distinct tg.title), null) as tags,
  array_remove(array_agg(distinct tg.id), null) as tag_ids,
  case
    when t.type = 'transfer' and t.transfer_id is not null
    then get_transfer_wallet_id(t.transfer_id, t.id)
    else null
  end as transfer_wallet_id,
  coalesce(oc.associations, '[]'::jsonb) as ontology_associations,
  coalesce(oc.entity_ids, '{}'::uuid[]) as ontology_entity_ids
from public.transactions t
left join public.transaction_tags tt on t.id = tt.transaction_id
left join public.tags tg on tg.id = tt.tag_id
left join lateral (
  select
    jsonb_agg(
      jsonb_build_object(
        'entityId', oe.id,
        'ontologyId', oe.ontology_id,
        'sourceObjectId', oe.source_object_id,
        'type', oe.entity_type,
        'name', oe.canonical_name,
        'subtitle', oe.subtitle
      )
      order by oe.entity_type, oe.canonical_name
    ) as associations,
    array_agg(oe.id order by oe.id) as entity_ids
  from public.transaction_ontology_associations toa
  join public.ontology_entities oe on oe.id = toa.ontology_entity_id
  where toa.transaction_id = t.id
) oc on true
group by t.id, oc.associations, oc.entity_ids;
