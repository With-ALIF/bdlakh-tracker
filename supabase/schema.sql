-- =============================================================
-- Money Mate – Supabase Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 1. PAYMENT PROVIDERS
-- ─────────────────────────────────────────────────────────────
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

-- Seed defaults
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
)
on conflict (id) do update
set
  name = excluded.name,
  icon = excluded.icon;

-- ─────────────────────────────────────────────────────────────
-- 2. USERS  (extends auth.users)
-- ─────────────────────────────────────────────────────────────
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

-- Auto-create profile on signup
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

-- ─────────────────────────────────────────────────────────────
-- 3. CATEGORIES
-- ─────────────────────────────────────────────────────────────
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  name       text not null,
  is_income  boolean not null default false,
  is_default boolean not null default false,
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

-- Seed default categories
insert into public.categories (user_id, name, is_income, is_default) values
-- Income
(null, 'Salary',        true,  true),
(null, 'Freelancing',   true,  true),
(null, 'Business',      true,  true),
(null, 'Investment',    true,  true),
(null, 'Gift',          true,  true),
(null, 'Bonus',         true,  true),
(null, 'Loan Taken',    true,  true),
(null, 'Loan Repayment',true,  true),
(null, 'Others',        true,  true),
-- Expense
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
(null, 'Others',          false, true);

-- ─────────────────────────────────────────────────────────────
-- 4. WALLETS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5. TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  wallet_id        uuid not null references public.wallets(id) on delete cascade,
  category_id      uuid references public.categories(id),
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

-- ─────────────────────────────────────────────────────────────
-- 6. TRANSFERS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 7. LOANS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 8. LOAN PAYMENTS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 9. LOAN INCREASES
-- ─────────────────────────────────────────────────────────────
create table public.loan_increases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  loan_id       uuid not null references public.loans(id) on delete cascade,
  amount        numeric(12,2) not null,
  increase_date date not null,
  account_id    uuid references public.wallets(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.loan_increases enable row level security;

create policy "Users can CRUD own loan increases"
  on public.loan_increases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_loan_increases_loan on public.loan_increases(loan_id);
