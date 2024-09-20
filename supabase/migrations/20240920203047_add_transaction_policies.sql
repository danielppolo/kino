-- Enable RLS for transactions table
alter table transactions enable row level security;
-- Create policy to allow users to access transactions if they own the associated wallet
create policy "transactions_policy" 
    on transactions 
    for select to authenticated using (exists (
        select 1 
        from wallets 
        where wallets.id = transactions.wallet_id 
        and wallets.user_id = auth.uid()
    ));
create policy "transactions_insert_policy"
    on transactions
    for insert to authenticated with check (exists (
        select 1 
        from wallets 
        where wallets.id = transactions.wallet_id 
        and wallets.user_id = auth.uid()
    ));
create policy "transactions_update_policy"
    on transactions
    for update to authenticated using (exists (
        select 1 
        from wallets 
        where wallets.id = transactions.wallet_id 
        and wallets.user_id = auth.uid()
    ));
create policy "transactions_delete_policy"
    on transactions
    for delete to authenticated using (exists (
        select 1 
        from wallets 
        where wallets.id = transactions.wallet_id 
        and wallets.user_id = auth.uid()
    ));
