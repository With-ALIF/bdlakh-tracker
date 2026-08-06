insert into public.categories (user_id, name, is_income, is_default, is_enabled)
values
  (null, 'Transfer Charge', false, true, true),
  (null, 'Transfer',        false, true, true)
on conflict do nothing;
