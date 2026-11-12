-- Ativa Aline: schema inicial (Postgres 14+; Supabase ou Neon).
-- Acesso: só o servidor fala com o banco (DATABASE_URL). RLS ligado sem
-- políticas = as chaves públicas do Supabase (anon) não leem nada.

create extension if not exists pgcrypto;

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('instagram','whatsapp')),
  external_id text not null,          -- IG user_id (entry.id do webhook) | WA phone_number_id
  display_name text,
  access_token_enc text not null,     -- AES-256-GCM (lib/crypto.ts)
  token_expires_at timestamptz,       -- Instagram: ~60 dias; WhatsApp system user: null
  status text not null default 'connected'
    check (status in ('connected','token_expired','error','disconnected')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, external_id)
);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  name text not null,
  trigger text not null check (trigger in ('ig_comment','ig_dm','wa_message')),
  post_id text,                         -- só ig_comment; null = qualquer post
  keywords text[] not null default '{}', -- normalizadas; vazio = qualquer texto
  match_mode text not null default 'contains' check (match_mode in ('contains','exact')),
  public_reply text,
  tag_to_add text,
  is_active boolean not null default false,
  priority int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_only_for_comments check (post_id is null or trigger = 'ig_comment'),
  constraint public_reply_only_for_comments check (public_reply is null or trigger = 'ig_comment')
);
create index if not exists automations_lookup on automations (channel_id, trigger) where is_active;

create table if not exists automation_messages (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('text','image','buttons')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (automation_id, position)
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  external_id text not null,          -- IGSID | wa_id
  name text,
  username text,
  tags text[] not null default '{}',
  last_inbound_at timestamptz,        -- janela de 24h (DM / WhatsApp)
  bot_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, external_id)
);
create index if not exists contacts_recent on contacts (last_inbound_at desc nulls last);
create index if not exists contacts_tags on contacts using gin (tags);

create table if not exists inbound_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  kind text not null check (kind in ('ig_comment','ig_dm','wa_message')),
  external_event_id text not null,    -- comment id | mid | wamid
  text text,
  post_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (channel_id, external_event_id)
);
create index if not exists inbound_recent on inbound_events (received_at desc);
create index if not exists inbound_contact on inbound_events (contact_id, received_at desc);

create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid references automations(id) on delete set null,
  contact_id uuid not null references contacts(id) on delete cascade,
  inbound_event_id uuid references inbound_events(id) on delete cascade,
  kind text not null check (kind in ('private_reply','public_reply','dm','wa')),
  status text not null default 'sent' check (status in ('sent','failed','skipped')),
  error text,
  sent_at timestamptz not null default now()
);
create index if not exists dispatches_recent on dispatches (sent_at desc);
create index if not exists dispatches_automation on dispatches (automation_id, sent_at desc);
create unique index if not exists one_private_reply_per_comment
  on dispatches (inbound_event_id) where kind = 'private_reply' and status = 'sent';

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists t_channels on channels;
create trigger t_channels before update on channels for each row execute function touch_updated_at();
drop trigger if exists t_automations on automations;
create trigger t_automations before update on automations for each row execute function touch_updated_at();
drop trigger if exists t_contacts on contacts;
create trigger t_contacts before update on contacts for each row execute function touch_updated_at();

alter table channels enable row level security;
alter table automations enable row level security;
alter table automation_messages enable row level security;
alter table contacts enable row level security;
alter table inbound_events enable row level security;
alter table dispatches enable row level security;
