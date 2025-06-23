alter table transactions enable row level security;
alter table wallets enable row level security;
alter table categories enable row level security;
alter table labels enable row level security;

create policy "wallet_select" on wallets
for select to authenticated
using (
  -- Check if the user has access to the wallet via user_wallets
  exists (
    select 1 from user_wallets
    where user_wallets.user_id = auth.uid()
    and user_wallets.wallet_id = wallets.id
  )
);

create policy "wallet_insert" 
  on wallets
  for insert 
  to authenticated
  with check (true);

create policy "wallet_update" on wallets
for update to authenticated using (
  exists (
    select 1 from user_wallets
    where user_wallets.user_id = auth.uid()
    and user_wallets.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
) with check (true);

create policy "wallet_delete" on wallets
for delete to authenticated using (
  exists (
    select 1 from user_wallets
    where user_wallets.user_id = auth.uid()
    and user_wallets.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
);


create policy "transaction_select" on transactions
for select to authenticated
using (
  -- Check if the user has access to the wallet via user_wallets
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and transactions.wallet_id = wallets.id
  )
);

create policy "transaction_insert" on transactions
for insert to authenticated with check (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and transactions.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
);

create policy "transaction_update" on transactions
for update to authenticated using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and transactions.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
) with check (true);

create policy "transaction_delete" on transactions
for delete using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and transactions.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
);



-- Create policy to allow users to access their own subjects
create policy "categories_policy" 
    on categories 
    for select using ( (select auth.uid()) = user_id );
create policy "categories_insert_policy" 
    on categories 
    for insert
    to authenticated
    with check (true);
create policy "categories_update_policy"
    on categories
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "categories_delete_policy"
    on categories
    for delete using ( (select auth.uid()) = user_id );


create policy "labels_policy" 
    on labels 
    for select using ( (select auth.uid()) = user_id );
create policy "labels_insert_policy" 
    on labels 
    for insert
    to authenticated
    with check (true);
create policy "labels_update_policy"
    on labels
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "labels_delete_policy"
    on labels
    for delete using ( (select auth.uid()) = user_id );

create policy "tags_policy"
    on tags
    for select using ( (select auth.uid()) = user_id );
create policy "tags_insert_policy"
    on tags
    for insert
    to authenticated
    with check (true);
create policy "tags_update_policy"
    on tags
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "tags_delete_policy"
    on tags
    for delete using ( (select auth.uid()) = user_id );

