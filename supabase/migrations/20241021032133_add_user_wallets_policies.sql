create policy "user_wallets_insert" 
on user_wallets
for insert 
to authenticated
with check (
-- Condition 1: Allow editors to insert for wallets they have access to
exists (
    select 1 from user_wallets as uw
    where uw.user_id = auth.uid()
    and uw.wallet_id = user_wallets.wallet_id
    and uw.role = 'editor'
)
-- Condition 2: Allow insert when no user_wallets exist for the given wallet
or not exists (
    select 1 from user_wallets as uw
    where uw.wallet_id = user_wallets.wallet_id
)
);

create policy "user_wallets_update" 
on user_wallets
for update 
to authenticated
using (
exists (
    select 1 from user_wallets as uw
    where uw.user_id = auth.uid()
    and uw.wallet_id = user_wallets.wallet_id
    and uw.role = 'editor'
)
)
with check (
exists (
    select 1 from user_wallets as uw
    where uw.user_id = auth.uid()
    and uw.wallet_id = user_wallets.wallet_id
    and uw.role = 'editor'
)
);

create policy "user_wallets_delete" 
on user_wallets
for delete 
to authenticated
using (
exists (
    select 1 from user_wallets as uw
    where uw.user_id = auth.uid()
    and uw.wallet_id = user_wallets.wallet_id
    and uw.role = 'editor'
)
);