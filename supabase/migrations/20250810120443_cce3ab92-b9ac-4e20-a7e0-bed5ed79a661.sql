-- Address linter warn: set function search_path
create or replace function public.update_updated_at_column()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;