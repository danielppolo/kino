alter table public.plaid_transaction_rules
drop constraint if exists plaid_transaction_rules_category_id_fkey;

alter table public.plaid_transaction_rules
alter column category_id drop not null;

alter table public.plaid_transaction_rules
add constraint plaid_transaction_rules_category_id_fkey
foreign key (category_id)
references public.categories(id)
on delete set null;

create table public.plaid_transaction_rule_ontology_associations (
  rule_id uuid not null
    references public.plaid_transaction_rules(id) on delete cascade,
  ontology_entity_id uuid not null,
  entity_type text not null check (
    entity_type in ('person', 'place', 'organization', 'trip')
  ),
  created_at timestamptz not null default now(),
  primary key (rule_id, ontology_entity_id),
  foreign key (ontology_entity_id, entity_type)
    references public.ontology_entities(id, entity_type)
    on delete restrict
);

create unique index plaid_transaction_rule_ontology_singleton_type_key
  on public.plaid_transaction_rule_ontology_associations (rule_id, entity_type)
  where entity_type in ('place', 'organization', 'trip');

create index plaid_transaction_rule_ontology_entity_idx
  on public.plaid_transaction_rule_ontology_associations (
    ontology_entity_id,
    rule_id
  );

alter table public.plaid_transaction_rule_ontology_associations
enable row level security;

create policy "plaid_rule_ontology_associations_select"
on public.plaid_transaction_rule_ontology_associations
for select to authenticated
using (
  exists (
    select 1
    from public.plaid_transaction_rules ptr
    join public.user_wallets uw on uw.wallet_id = ptr.wallet_id
    where ptr.id = rule_id
      and uw.user_id = auth.uid()
  )
);

create policy "plaid_rule_ontology_associations_insert"
on public.plaid_transaction_rule_ontology_associations
for insert to authenticated
with check (
  exists (
    select 1
    from public.plaid_transaction_rules ptr
    join public.wallets w on w.id = ptr.wallet_id
    join public.user_wallets uw on uw.wallet_id = ptr.wallet_id
    join public.ontology_entities oe on oe.id = ontology_entity_id
    where ptr.id = rule_id
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

create policy "plaid_rule_ontology_associations_delete"
on public.plaid_transaction_rule_ontology_associations
for delete to authenticated
using (
  exists (
    select 1
    from public.plaid_transaction_rules ptr
    join public.user_wallets uw on uw.wallet_id = ptr.wallet_id
    where ptr.id = rule_id
      and uw.user_id = auth.uid()
      and uw.role in ('owner', 'editor')
  )
);
