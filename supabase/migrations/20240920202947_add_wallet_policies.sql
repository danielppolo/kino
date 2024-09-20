-- Enable RLS for wallets table
alter table wallets enable row level security;
-- Create policy to allow users to access their own wallets
create policy "wallets_policy" 
    on wallets 
    for select using ( (select auth.uid()) = user_id );
create policy "wallets_insert_policy" 
    on wallets 
    for insert to authenticated with check ( (select auth.uid()) = user_id );
create policy "wallets_update_policy"
    on wallets
    for update to authenticated using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "wallets_delete_policy"
    on wallets
    for delete to authenticated using ( (select auth.uid()) = user_id );
