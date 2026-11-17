-- Replace: contas, créditos e pagamentos. Tabelas com prefixo rp_ (podem morar no mesmo banco do Ativa Aline).
create extension if not exists pgcrypto;

create table if not exists rp_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  pass_hash text not null,
  balance_cents int not null default 0 check (balance_cents >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Extrato: toda entrada e saída de crédito.
create table if not exists rp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rp_users(id) on delete cascade,
  amount_cents int not null,               -- positivo = entrada, negativo = uso
  kind text not null check (kind in ('compra','bonus','uso','estorno','ajuste')),
  description text not null,
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists rp_ledger_user on rp_ledger (user_id, created_at desc);

create table if not exists rp_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rp_users(id) on delete cascade,
  pack text not null,
  price_cents int not null,
  credit_cents int not null,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  mp_preference_id text,
  mp_payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rp_purchases_user on rp_purchases (user_id, created_at desc);

create table if not exists rp_settings (
  key text primary key,
  value jsonb not null
);

alter table rp_users enable row level security;
alter table rp_ledger enable row level security;
alter table rp_purchases enable row level security;
alter table rp_settings enable row level security;
