-- Landing SaaS — Supabase (Postgres) schema for the real free deploy.
-- Idempotent: safe to run more than once in the SQL editor.
-- The app's local dev/test mode uses data/store.json instead; these
-- tables mirror lib/store.js collections 1:1 for the Phase-2 swap.

create table if not exists saas_users (
  id uuid primary key,
  name text not null default '',
  email text not null unique,
  password_hash text not null,
  shop_name text not null default '',
  wallet_balance integer not null default 0,
  paid_through timestamptz not null,
  suspended boolean not null default false,
  pixel_id text not null default '',
  courier jsonb not null default '{}'::jsonb,
  billing_warn_for timestamptz,
  billing_fail_for timestamptz,
  email_verified boolean not null default true,
  status text not null default 'active', -- active | pending (email not yet verified)
  verify_code_hash text, -- SHA-256 of the 6-digit code; never the plain code
  verify_code_expires_at timestamptz,
  verify_attempts integer not null default 0,
  verify_sent_at timestamptz,
  failed_logins integer not null default 0,
  lock_until timestamptz,
  created_at timestamptz not null default now()
);

-- Auth upgrade columns for databases created before they existed
-- (idempotent — safe to re-run the whole file).
alter table saas_users add column if not exists email_verified boolean not null default true;
alter table saas_users add column if not exists status text not null default 'active';
alter table saas_users add column if not exists verify_code_hash text;
alter table saas_users add column if not exists verify_code_expires_at timestamptz;
alter table saas_users add column if not exists verify_attempts integer not null default 0;
alter table saas_users add column if not exists verify_sent_at timestamptz;
alter table saas_users add column if not exists failed_logins integer not null default 0;
alter table saas_users add column if not exists lock_until timestamptz;

create table if not exists saas_pages (
  id uuid primary key,
  user_id uuid not null references saas_users(id) on delete cascade,
  title text not null default '',
  slug text not null unique,
  template_id text not null default 'classic-sales',
  product_id uuid,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists saas_pages_user_idx on saas_pages(user_id);

create table if not exists saas_products (
  id uuid primary key,
  user_id uuid not null references saas_users(id) on delete cascade,
  name text not null default '',
  price integer not null default 0,
  image_url text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists saas_products_user_idx on saas_products(user_id);

create table if not exists saas_orders (
  id uuid primary key,
  user_id uuid not null references saas_users(id) on delete cascade,
  page_id uuid references saas_pages(id) on delete set null,
  product_id uuid references saas_products(id) on delete set null,
  customer_name text not null default '',
  phone text not null default '',
  address text not null default '',
  quantity integer not null default 1,
  total integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists saas_orders_user_idx on saas_orders(user_id);

-- Wallet ledger: every balance change is one row; saas_users.wallet_balance
-- is the running total and ledger.balance_after mirrors it per entry.
create table if not exists saas_ledger (
  id uuid primary key,
  user_id uuid not null references saas_users(id) on delete cascade,
  type text not null, -- deposit | subscription | adjustment
  amount integer not null, -- signed: + credit, - debit
  balance_after integer not null,
  note text not null default '',
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists saas_ledger_user_idx on saas_ledger(user_id);

create table if not exists saas_deposits (
  id uuid primary key,
  user_id uuid not null references saas_users(id) on delete cascade,
  method text not null default '',
  trx_id text not null default '',
  amount integer not null default 0,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now()
);
create index if not exists saas_deposits_status_idx on saas_deposits(status);

create table if not exists saas_email_outbox (
  id uuid primary key,
  user_id uuid references saas_users(id) on delete set null,
  to_email text not null default '',
  kind text not null default '', -- due_warning | payment_failed | subscription_paid | verify
  subject text not null default '',
  body text not null default '',
  status text not null default 'queued', -- queued | sent
  created_at timestamptz not null default now()
);

-- The app connects with the service_role key (server-side only), so RLS
-- stays disabled here exactly like the existing SHERA IT projects.
