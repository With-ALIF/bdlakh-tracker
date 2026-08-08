-- Drop FK constraint on transactions.category_id so it can reference
-- both the categories table AND user_categories table (two separate UUID PKs).
-- PostgreSQL does not allow a single FK column to reference two tables,
-- so we remove the constraint and rely on application-level validation.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
