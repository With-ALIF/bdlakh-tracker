ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

create table public.transfer_charges (
  id              uuid primary key default gen_random_uuid(),
  from_provider   uuid not null references public.payment_providers(id) on delete cascade,
  to_provider     uuid not null references public.payment_providers(id) on delete cascade,
  charge_rate     numeric(5,2) not null default 0,
  is_super_agent  boolean not null default false,
  label           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(from_provider, to_provider, is_super_agent)
);

alter table public.transfer_charges enable row level security;

create policy "Anyone can read transfer charges"
  on public.transfer_charges for select
  using (true);

create index idx_transfer_charges_providers on public.transfer_charges(from_provider, to_provider);

insert into public.transfer_charges (from_provider, to_provider, charge_rate, is_super_agent, label) values
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1.85,   false, 'Bkash Cash Out'),
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1.395,  true,  'Bkash Super Agent'),
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 1.45,   false, 'Nagad Cash Out'),
('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 1.67,   false, 'Rocket Cash Out'),
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 0.85,   false, 'Bkash to Bank'),
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 0.85,   false, 'Bkash to Nagad'),
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 0.85,   false, 'Nagad to Bank'),
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 0.85,   false, 'Nagad to Bkash'),
('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 0.00,   false, 'Bank to Cash');

ALTER TABLE public.transfer_charges
ADD COLUMN flat_fee numeric(10,2) NOT NULL DEFAULT 0;

INSERT INTO public.transfer_charges (from_provider, to_provider, charge_rate, flat_fee, is_super_agent, label)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  0.00,
  5.00,
  false,
  'Bkash 5 Tk Charge'
);

insert into public.categories (user_id, name, is_income, is_default, is_enabled)
values
  (null, 'Transfer Charge', false, true, true),
  (null, 'Transfer',        false, true, true)
on conflict do nothing;

alter table public.loan_increases add column if not exists is_special_number boolean not null default true;

create table if not exists public.savings_withdrawals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  goal_id           uuid not null references public.savings_goals(id) on delete cascade,
  wallet_id         uuid references public.wallets(id) on delete set null,
  savings_wallet_id uuid references public.wallets(id) on delete set null,
  transfer_id       uuid references public.transfers(id) on delete set null,
  amount            numeric(12,2) not null,
  reason            text not null,
  withdraw_date     date not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.savings_withdrawals enable row level security;

create policy "Users can manage own withdrawals"
  on public.savings_withdrawals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_withdrawals_goal on public.savings_withdrawals(goal_id);
create index idx_withdrawals_user on public.savings_withdrawals(user_id);

create table if not exists public.user_photos (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_photos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Anyone can read user photos' and tablename = 'user_photos'
  ) then
    create policy "Anyone can read user photos"
      on public.user_photos for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users can insert own photo' and tablename = 'user_photos'
  ) then
    create policy "Users can insert own photo"
      on public.user_photos for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users can update own photo' and tablename = 'user_photos'
  ) then
    create policy "Users can update own photo"
      on public.user_photos for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users can delete own photo' and tablename = 'user_photos'
  ) then
    create policy "Users can delete own photo"
      on public.user_photos for delete using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.handle_user_photo_update()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_user_photo_updated on public.user_photos;
create trigger on_user_photo_updated
  before update on public.user_photos
  for each row execute function public.handle_user_photo_update();

create or replace function public.upsert_user_photo(
  p_user_id uuid,
  p_photo_url text
)
returns void as $$
begin
  insert into public.user_photos (user_id, photo_url)
  values (p_user_id, p_photo_url)
  on conflict (user_id) do update
  set photo_url = excluded.photo_url,
      updated_at = now();
end;
$$ language plpgsql security invoker;

grant execute on function public.upsert_user_photo(uuid, text) to authenticated;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'photo_url'
  ) then
    insert into public.user_photos (user_id, photo_url, created_at, updated_at)
    select id, photo_url, now(), now()
    from public.profiles
    where photo_url is not null and photo_url != ''
    on conflict (user_id) do update
    set photo_url = excluded.photo_url,
        updated_at = now();

    alter table public.profiles drop column if exists photo_url;

    raise notice 'Migration complete: photo_url moved to user_photos and column dropped from profiles';
  else
    raise notice 'profiles.photo_url does not exist — skipping migration';
  end if;
end $$;
