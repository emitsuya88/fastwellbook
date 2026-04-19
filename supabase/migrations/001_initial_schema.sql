-- ============================================================
-- 001_initial_schema.sql
-- Run via: supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- BUSINESSES
-- ============================================================
create table businesses (
  id                 uuid primary key default uuid_generate_v4(),
  owner_id           uuid references auth.users(id) on delete cascade not null,
  name               text not null,
  slug               text unique not null,
  category           text not null check (category in ('salon_spa', 'fitness_yoga')),
  description        text,
  email              text not null,
  phone              text,
  address            text,
  stripe_account_id  text unique,           -- Stripe Connect Express account ID
  stripe_onboarded   boolean default false, -- true once Stripe details_submitted
  active             boolean default true,
  created_at         timestamptz default now()
);

-- RLS
alter table businesses enable row level security;

create policy "Owner reads own business"
  on businesses for select
  using (owner_id = auth.uid());

create policy "Owner updates own business"
  on businesses for update
  using (owner_id = auth.uid());

create policy "Public can read active businesses"
  on businesses for select
  using (active = true);

-- ============================================================
-- SERVICES
-- ============================================================
create table services (
  id             uuid primary key default uuid_generate_v4(),
  business_id    uuid references businesses(id) on delete cascade not null,
  name           text not null,
  description    text,
  duration_mins  integer not null check (duration_mins > 0),
  price_pence    integer not null check (price_pence > 0), -- stored in pence (GBP)
  active         boolean default true,
  created_at     timestamptz default now()
);

alter table services enable row level security;

create policy "Business owner manages services"
  on services for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

create policy "Public reads active services"
  on services for select
  using (active = true);

-- ============================================================
-- AVAILABILITY
-- Recurring weekly slots per business
-- ============================================================
create table availability (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid references businesses(id) on delete cascade not null,
  day_of_week  integer not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  start_time   time not null,
  end_time     time not null,
  check (end_time > start_time)
);

alter table availability enable row level security;

create policy "Business owner manages availability"
  on availability for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

create policy "Public reads availability"
  on availability for select
  using (true);

-- ============================================================
-- CUSTOMERS
-- Lightweight profile linked to auth.users
-- ============================================================
create table customers (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  phone       text,
  created_at  timestamptz default now()
);

alter table customers enable row level security;

create policy "Customer reads own record"
  on customers for select
  using (id = auth.uid());

create policy "Customer updates own record"
  on customers for update
  using (id = auth.uid());

-- ============================================================
-- BOOKINGS
-- ============================================================
create table bookings (
  id                        uuid primary key default uuid_generate_v4(),
  business_id               uuid references businesses(id) not null,
  customer_id               uuid references customers(id),   -- null = guest
  service_id                uuid references services(id) not null,
  starts_at                 timestamptz not null,
  ends_at                   timestamptz not null,
  -- Snapshot pricing at booking time (never recalculate)
  total_pence               integer not null,
  commission_pence          integer not null,               -- 8% of total
  -- Stripe
  stripe_payment_intent_id  text unique,
  stripe_checkout_session_id text unique,
  -- Guest fields (when customer_id is null)
  guest_email               text,
  guest_name                text,
  guest_phone               text,
  -- Status
  status                    text not null default 'pending'
                            check (status in ('pending','confirmed','cancelled','completed','refunded')),
  notes                     text,
  created_at                timestamptz default now(),
  check (
    customer_id is not null or (guest_email is not null and guest_name is not null)
  )
);

alter table bookings enable row level security;

create policy "Business owner reads own bookings"
  on bookings for select
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

create policy "Customer reads own bookings"
  on bookings for select
  using (customer_id = auth.uid());

-- Service role key bypasses RLS (used in API routes + webhooks)

-- ============================================================
-- INDEXES
-- ============================================================
create index bookings_business_id_starts_at on bookings(business_id, starts_at);
create index bookings_stripe_session on bookings(stripe_checkout_session_id);
create index businesses_slug on businesses(slug);

-- ============================================================
-- HELPER: commission calculation
-- ============================================================
create or replace function calculate_commission(total_pence integer)
returns integer language sql immutable as $$
  select round(total_pence * 0.08)::integer;
$$;
