create extension if not exists "uuid-ossp";

create table public.payment_providers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text not null default 'wallet',
  created_at timestamptz not null default now()
);

alter table public.payment_providers enable row level security;

create policy "Anyone can read payment providers"
  on public.payment_providers for select
  using (true);

insert into public.payment_providers (id, name, icon)
values
(
  'a0000000-0000-0000-0000-000000000001',
  'Cash',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMZNt3WzFNMK6lk77Md1I_Bz6GpXh8PWhYe-IFr0m2SA&s=10'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'Bkash',
  'https://static.vecteezy.com/system/resources/previews/039/340/798/non_2x/bkash-logo-free-vector.jpg'
),
(
  'a0000000-0000-0000-0000-000000000003',
  'Nagad',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7x4tqkMqhSTJP70NjbamU4GjWZhAc1eSCwQPrqeJ7Dw&s=10'
),
(
  'a0000000-0000-0000-0000-000000000004',
  'Rocket',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTImDMUhElLiivUwlRk-xrcDLkSPvdOadomCn62o0cgzQ&s=10'
),
(
  'a0000000-0000-0000-0000-000000000005',
  'Bank',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQU0XsZiQqR6FJMcIyaCMYnDBVdySk4ZPHsUkRF-hrYJXzAnUxXyh7fOZ86&s=10'
),
(
  'a0000000-0000-0000-0000-000000000006',
  'Savings Wallet',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMZNt3WzFNMK6lk77Md1I_Bz6GpXh8PWhYe-IFr0m2SA&s=10'
)
on conflict (id) do update
set
  name = excluded.name,
  icon = excluded.icon;

create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  name       text not null,
  is_income  boolean not null default false,
  is_default boolean not null default false,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can read own and default categories"
  on public.categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

insert into public.categories (user_id, name, is_income, is_default) values
(null, 'Salary',        true,  true),
(null, 'Freelancing',   true,  true),
(null, 'Business',      true,  true),
(null, 'Investment',    true,  true),
(null, 'Gift',          true,  true),
(null, 'Bonus',         true,  true),
(null, 'Loan Taken',    true,  true),
(null, 'Loan Repayment',true,  true),
(null, 'Others',        true,  true),
(null, 'Food',            false, true),
(null, 'Groceries',       false, true),
(null, 'Shopping',        false, true),
(null, 'Clothing',        false, true),
(null, 'Transport',       false, true),
(null, 'Mobile Recharge', false, true),
(null, 'Internet Bill',   false, true),
(null, 'Electricity',     false, true),
(null, 'Gas',             false, true),
(null, 'Rent',            false, true),
(null, 'Education',       false, true),
(null, 'Tuition',         false, true),
(null, 'Medicine',        false, true),
(null, 'Loan Given',      false, true),
(null, 'Loan Payment',    false, true),
(null, 'EMI',             false, true),
(null, 'Savings',         false, true),
(null, 'Entertainment',   false, true),
(null, 'Travel',          false, true),
(null, 'Transfer Charge', false, true),
(null, 'Transfer',        false, true),
(null, 'Others',          false, true);

create table public.category_settings (
  user_id     uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_enabled  boolean not null default false,
  primary key (user_id, category_id)
);

alter table public.category_settings enable row level security;

create policy "Users can manage own category settings"
  on public.category_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.wallets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  provider_id     uuid references public.payment_providers(id),
  name            text not null,
  account_name    text,
  type            text not null default 'other',
  icon            text not null default 'wallet',
  color           text not null default '#475569',
  opening_balance numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "Users can CRUD own wallets"
  on public.wallets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_wallets_user on public.wallets(user_id);

create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  wallet_id        uuid not null references public.wallets(id) on delete cascade,
  category_id      uuid,
  title            text not null,
  amount           numeric(12,2) not null,
  is_income        boolean not null default false,
  transaction_date date not null,
  loan_id          uuid,
  loan_payment_id  uuid,
  loan_increase_id uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can CRUD own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_transactions_user on public.transactions(user_id);
create index idx_transactions_date on public.transactions(transaction_date);
create index idx_transactions_wallet on public.transactions(wallet_id);

create table public.transfers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  from_wallet_id uuid not null references public.wallets(id) on delete cascade,
  to_wallet_id  uuid not null references public.wallets(id) on delete cascade,
  amount        numeric(12,2) not null,
  transfer_date date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.transfers enable row level security;

create policy "Users can CRUD own transfers"
  on public.transfers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_transfers_user on public.transfers(user_id);

create table public.loans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  wallet_id       uuid references public.wallets(id) on delete set null,
  person_name     text not null,
  loan_type       text not null default 'General',
  is_receivable   boolean not null default true,
  total_amount    numeric(12,2) not null default 0,
  paid_amount     numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,
  loan_date       date not null,
  due_date        date,
  is_completed    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.loans enable row level security;

create policy "Users can CRUD own loans"
  on public.loans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_loans_user on public.loans(user_id);

create table public.loan_payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  loan_id      uuid not null references public.loans(id) on delete cascade,
  amount       numeric(12,2) not null,
  payment_date date not null,
  account_id   uuid references public.wallets(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.loan_payments enable row level security;

create policy "Users can CRUD own loan payments"
  on public.loan_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_loan_payments_loan on public.loan_payments(loan_id);

create table public.loan_increases (
  id            uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  loan_id      uuid not null references public.loans(id) on delete cascade,
  amount       numeric(12,2) not null,
  increase_date date not null,
  account_id   uuid references public.wallets(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.loan_increases enable row level security;

create policy "Users can CRUD own loan increases"
  on public.loan_increases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_loan_increases_loan on public.loan_increases(loan_id);

create or replace function public.sync_wallet_balance()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_TABLE_NAME = 'transactions' then
    if TG_OP = 'INSERT' then
      update public.wallets
        set current_balance = current_balance + (case when NEW.is_income then NEW.amount else -NEW.amount end)
        where id = NEW.wallet_id;

    elsif TG_OP = 'DELETE' then
      update public.wallets
        set current_balance = current_balance + (case when OLD.is_income then -OLD.amount else OLD.amount end)
        where id = OLD.wallet_id;

    elsif TG_OP = 'UPDATE' then
      update public.wallets
        set current_balance = current_balance + (case when OLD.is_income then -OLD.amount else OLD.amount end)
        where id = OLD.wallet_id;
      update public.wallets
        set current_balance = current_balance + (case when NEW.is_income then NEW.amount else -NEW.amount end)
        where id = NEW.wallet_id;
    end if;

  elsif TG_TABLE_NAME = 'transfers' then
    if TG_OP = 'INSERT' then
      update public.wallets set current_balance = current_balance - NEW.amount where id = NEW.from_wallet_id;
      update public.wallets set current_balance = current_balance + NEW.amount where id = NEW.to_wallet_id;

    elsif TG_OP = 'DELETE' then
      update public.wallets set current_balance = current_balance + OLD.amount where id = OLD.from_wallet_id;
      update public.wallets set current_balance = current_balance - OLD.amount where id = OLD.to_wallet_id;

    elsif TG_OP = 'UPDATE' then
      update public.wallets set current_balance = current_balance + OLD.amount where id = OLD.from_wallet_id;
      update public.wallets set current_balance = current_balance - OLD.amount where id = OLD.to_wallet_id;
      update public.wallets set current_balance = current_balance - NEW.amount where id = NEW.from_wallet_id;
      update public.wallets set current_balance = current_balance + NEW.amount where id = NEW.to_wallet_id;
    end if;

  end if;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_sync_balance_on_tx
  after insert or delete or update on public.transactions
  for each row execute function public.sync_wallet_balance();

create trigger trg_sync_balance_on_transfer
  after insert or delete or update on public.transfers
  for each row execute function public.sync_wallet_balance();

create table public.user_photos (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_photos enable row level security;

create policy "Anyone can read user photos"
  on public.user_photos for select
  using (true);

create policy "Users can insert own photo"
  on public.user_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own photo"
  on public.user_photos for update
  using (auth.uid() = user_id);

create policy "Users can delete own photo"
  on public.user_photos for delete
  using (auth.uid() = user_id);

create or replace function public.handle_user_photo_update()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger on_user_photo_updated
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

with ranked as (
  select id,
         first_value(id) over (
           partition by coalesce(user_id::text, 'default'), lower(name), is_income
           order by created_at, id
         ) as keep_id
  from public.categories
)
update public.transactions t
set category_id = r.keep_id
from ranked r
where t.category_id = r.id
  and r.id <> r.keep_id;

with ranked as (
  select id,
         first_value(id) over (
           partition by coalesce(user_id::text, 'default'), lower(name), is_income
           order by created_at, id
         ) as keep_id
  from public.categories
)
delete from public.categories c
using ranked r
where c.id = r.id and r.id <> r.keep_id;

create unique index if not exists categories_user_name_type_uniq
  on public.categories (user_id, lower(name), is_income)
  where user_id is not null;

create unique index if not exists categories_default_name_type_uniq
  on public.categories (lower(name), is_income)
  where user_id is null;

create table if not exists public.category_settings (
  user_id     uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_enabled  boolean not null default false,
  primary key (user_id, category_id)
);

insert into public.category_settings (user_id, category_id, is_enabled)
select
  uc.user_id,
  dc.id,
  false
from public.categories uc
join public.categories dc
  on dc.user_id is null
  and lower(dc.name) = lower(uc.name)
  and dc.is_income = uc.is_income
where uc.user_id is not null
  and uc.is_default = true
  and uc.is_enabled = false
on conflict (user_id, category_id) do nothing;

with ranked as (
  select id,
         first_value(id) over (
           partition by lower(name), is_income
           order by (case when user_id is null then 0 else 1 end), created_at, id
         ) as keep_id
  from public.categories
  where is_default = true
)
update public.transactions t
set category_id = r.keep_id
from ranked r
where t.category_id = r.id
  and r.id <> r.keep_id;

delete from public.categories
where user_id is not null and is_default = true;

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


create table if not exists public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  name          text not null,
  target_amount numeric(12,2) not null default 0,
  saved_amount  numeric(12,2) not null default 0,
  deadline      date,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.savings_goals enable row level security;

drop policy if exists "Users can CRUD own savings goals" on public.savings_goals;
create policy "Users can CRUD own savings goals"
  on public.savings_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_savings_goals_user on public.savings_goals(user_id);

create unique index if not exists idx_savings_goals_user_name on public.savings_goals(user_id, name);

grant select, insert, update, delete on public.savings_goals to authenticated;

create table if not exists public.saving_contributions (
  id                uuid primary key default gen_random_uuid(),
  goal_id           uuid not null references public.savings_goals(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  wallet_id         uuid references public.wallets(id) on delete set null,
  savings_wallet_id uuid references public.wallets(id) on delete set null,
  transfer_id       uuid references public.transfers(id) on delete set null,
  amount            numeric(12,2) not null,
  saving_date       date not null,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.saving_contributions enable row level security;

drop policy if exists "Users can CRUD own saving contributions" on public.saving_contributions;
create policy "Users can CRUD own saving contributions"
  on public.saving_contributions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_saving_contributions_goal on public.saving_contributions(goal_id);
create index if not exists idx_saving_contributions_user on public.saving_contributions(user_id);
create index if not exists idx_saving_contributions_transfer on public.saving_contributions(transfer_id);

grant select, insert, update, delete on public.saving_contributions to authenticated;
