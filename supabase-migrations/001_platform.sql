-- =====================================================================
-- منصة وتر الإحساس — هجرة قاعدة البيانات (نظام متعدد المناطق)
-- شغّل هذا الملف كاملاً في Supabase → SQL Editor → New query
-- =====================================================================

-- 1) Regions
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_number text not null,
  assistant_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.regions to anon, authenticated;
grant all on public.regions to service_role;
alter table public.regions enable row level security;
drop policy if exists "regions read" on public.regions;
create policy "regions read" on public.regions for select using (is_active = true);

-- 2) Pricing config (singleton)
create table if not exists public.pricing_config (
  id int primary key default 1,
  price_per_meter numeric not null default 25,
  embossed_premium_rate numeric not null default 0.3,
  currency text not null default '$',
  updated_at timestamptz not null default now(),
  constraint pricing_config_singleton check (id = 1)
);
grant select on public.pricing_config to anon, authenticated;
grant all on public.pricing_config to service_role;
alter table public.pricing_config enable row level security;
drop policy if exists "pricing read" on public.pricing_config;
create policy "pricing read" on public.pricing_config for select using (true);
insert into public.pricing_config (id, price_per_meter, embossed_premium_rate, currency)
  values (1, 25, 0.3, '$') on conflict (id) do nothing;

-- 3) Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.regions(id) on delete set null,
  region_name text,
  design_id uuid,
  design_name text,
  design_url text,
  width numeric not null,
  height numeric not null,
  embossed boolean not null default false,
  total numeric not null,
  customer_phone text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
drop policy if exists "orders insert" on public.orders;
create policy "orders insert" on public.orders for insert with check (true);
drop policy if exists "orders read auth" on public.orders;
create policy "orders read auth" on public.orders for select to authenticated using (true);
drop policy if exists "orders update auth" on public.orders;
create policy "orders update auth" on public.orders for update to authenticated using (true);

-- 4) Initial regions (يمكنك تعديلها من اللوحة)
insert into public.regions (name, whatsapp_number, assistant_name) values
  ('الدانا',     '963933000000', 'مساعد الدانا'),
  ('سرمدا',     '963933000001', 'مساعد سرمدا'),
  ('إدلب',      '963933000002', 'مساعد إدلب'),
  ('أرياف حلب', '963933000003', 'مساعد حلب')
  on conflict do nothing;
