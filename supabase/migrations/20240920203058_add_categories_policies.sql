-- Enable RLS for categories table
alter table categories enable row level security;
-- Create policy to allow users to access their own categories
create policy "categories_policy" 
    on categories 
    for select using ( (select auth.uid()) = user_id );
create policy "categories_insert_policy" 
    on categories 
    for insert
    to authenticated
    with check ( (select auth.uid()) = user_id );
create policy "categories_update_policy"
    on categories
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "categories_delete_policy"
    on categories
    for delete using ( (select auth.uid()) = user_id );
