-- ─────────────────────────────────────────────────────────────
-- TRANSFER CHARGES TABLE
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- SEED DATA (charge_rate stored as percentage)
-- Provider IDs:
--   Cash   = a0000000-0000-0000-0000-000000000001
--   Bkash  = a0000000-0000-0000-0000-000000000002
--   Nagad  = a0000000-0000-0000-0000-000000000003
--   Rocket = a0000000-0000-0000-0000-000000000004
--   Bank   = a0000000-0000-0000-0000-000000000005
-- ─────────────────────────────────────────────────────────────
insert into public.transfer_charges (from_provider, to_provider, charge_rate, is_super_agent, label) values
-- Cash Out (MFS → Cash)
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1.85,   false, 'Bkash Cash Out'),
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1.395,  true,  'Bkash Super Agent'),
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 1.45,   false, 'Nagad Cash Out'),
('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 1.67,   false, 'Rocket Cash Out'),

-- Send Money (MFS → MFS / MFS → Bank)
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 0.85, false, 'Bkash to Bank'),
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 0.85, false, 'Bkash to Nagad'),
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 0.85, false, 'Nagad to Bank'),
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 0.85, false, 'Nagad to Bkash'),

-- Bank → Cash (No charge)
('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 0.00, false, 'Bank to Cash');
