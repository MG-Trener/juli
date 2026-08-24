-- Выполнить в Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student' check (role in ('student','owner')),
  course_level int check (course_level between 1 and 7),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

create policy "student reads own profile" on public.profiles
for select using (id = auth.uid() or public.is_owner());

create policy "owner updates profiles" on public.profiles
for update using (public.is_owner()) with check (public.is_owner());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,email,full_name)
  values (new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- После регистрации аккаунта владельца выполните один раз,
-- подставив его email:
-- update public.profiles set role='owner' where email='OWNER_EMAIL';
