create table if not exists public.signal_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signal_user_state_data_size check (octet_length(data::text) <= 500000)
);

alter table public.signal_user_state enable row level security;

create policy "Users can read their Signal state"
  on public.signal_user_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their Signal state"
  on public.signal_user_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their Signal state"
  on public.signal_user_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their Signal state"
  on public.signal_user_state for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.signal_user_state to authenticated;

create or replace function public.set_signal_user_state_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists signal_user_state_updated_at on public.signal_user_state;
create trigger signal_user_state_updated_at
before update on public.signal_user_state
for each row execute function public.set_signal_user_state_updated_at();

create or replace function public.delete_signal_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke all on function public.delete_signal_account() from public;
revoke all on function public.delete_signal_account() from anon;
grant execute on function public.delete_signal_account() to authenticated;
