-- ─────────────────────────────────────────────────────────────
-- ADD FLAT FEE COLUMN TO TRANSFER CHARGES TABLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.transfer_charges
ADD COLUMN flat_fee numeric(10,2) NOT NULL DEFAULT 0;

-- Seed: Bkash 5 Tk flat charge (from_provider = Bkash, to_provider = Bkash)
INSERT INTO public.transfer_charges (from_provider, to_provider, charge_rate, flat_fee, is_super_agent, label)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  0.00,
  5.00,
  false,
  'Bkash 5 Tk Charge'
);
