-- Schema do clone de automação (Instagram + WhatsApp), Postgres / Supabase.
-- Acesso: RLS do Supabase. O painel usa a sessão do dono (auth.uid()).
-- Os webhooks e jobs usam a service role (ignora RLS) no servidor.

create extension if not exists pgcrypto;

-- Canais conectados -------------------------------------------------------
create table channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('instagram','whatsapp')),
  external_id text not null,          -- IG user id  |  WA phone_number_id
  display_name text,
  access_token_enc text not null,     -- criptografado no app (AES-GCM), nunca em texto puro
  token_expires_at timestamptz,       -- Instagram: 60 dias; WhatsApp system user: null
  status text not null default 'connected'
    check (status in ('connected','token_expired','error','disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, external_id)          -- o webhook acha o canal por aqui
);
create index on channels (owner_id);
create index on channels (token_expires_at) where kind = 'instagram';

-- Automações --------------------------------------------------------------
create table automations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  name text not null,
  trigger text not null check (trigger in ('ig_comment','ig_dm','wa_message')),
  post_id text,                       -- só ig_comment; null = qualquer post
  keywords text[] not null default '{}', -- normalizadas: minúsculas, sem acento
  match_mode text not null default 'contains' check (match_mode in ('contains','exact')),
  public_reply text,                  -- só ig_comment, opcional
  tag_to_add text,
  is_active boolean not null default false,
  priority int not null default 0,    -- se duas casarem, ganha a maior
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_only_for_comments check (post_id is null or trigger = 'ig_comment'),
  constraint public_reply_only_for_comments check (public_reply is null or trigger = 'ig_comment')
);
create index on automations (channel_id, trigger) where is_active;
create index on automations (owner_id);

-- Mensagens de cada automação (em ordem) ---------------------------------
create table automation_messages (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('text','image','buttons')),
  content jsonb not null,             -- {text} | {image_url} | {text, buttons:[{title,url}]} (máx 3)
  created_at timestamptz not null default now(),
  unique (automation_id, position)
);

-- Contatos ---------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  external_id text not null,          -- IGSID | wa_id
  name text,
  username text,
  tags text[] not null default '{}',
  last_inbound_at timestamptz,        -- abre a janela de 24h
  bot_paused boolean not null default false, -- humano assumiu (inbox)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, external_id)
);
create index on contacts (owner_id, last_inbound_at desc);
create index on contacts using gin (tags);

-- Eventos recebidos (idempotência dos webhooks) --------------------------
create table inbound_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  kind text not null check (kind in ('ig_comment','ig_dm','wa_message')),
  external_event_id text not null,    -- comment id | mid | wamid
  text text,
  post_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (channel_id, external_event_id)  -- webhook duplicado = insert ignorado
);
create index on inbound_events (owner_id, received_at desc);
create index on inbound_events (contact_id, received_at desc);

-- Disparos (o que o robô mandou) -----------------------------------------
create table dispatches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  contact_id uuid not null references contacts(id) on delete cascade,
  inbound_event_id uuid references inbound_events(id) on delete set null,
  kind text not null check (kind in ('private_reply','public_reply','dm','wa')),
  status text not null default 'sent' check (status in ('sent','failed','skipped')),
  error text,
  sent_at timestamptz not null default now()
);
create index on dispatches (owner_id, sent_at desc);
create index on dispatches (automation_id, sent_at desc);
-- Meta só permite UMA private reply por comentário:
create unique index one_private_reply_per_comment
  on dispatches (inbound_event_id) where kind = 'private_reply' and status = 'sent';

-- updated_at automático ---------------------------------------------------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_channels before update on channels for each row execute function touch_updated_at();
create trigger t_automations before update on automations for each row execute function touch_updated_at();
create trigger t_contacts before update on contacts for each row execute function touch_updated_at();

-- RLS: o dono só vê o que é dele ----------------------------------------
alter table channels enable row level security;
alter table automations enable row level security;
alter table automation_messages enable row level security;
alter table contacts enable row level security;
alter table inbound_events enable row level security;
alter table dispatches enable row level security;

create policy own on channels for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own on automations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own on contacts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_read on inbound_events for select using (owner_id = auth.uid());
create policy own_read on dispatches for select using (owner_id = auth.uid());
create policy own on automation_messages for all
  using (exists (select 1 from automations a where a.id = automation_id and a.owner_id = auth.uid()))
  with check (exists (select 1 from automations a where a.id = automation_id and a.owner_id = auth.uid()));
-- O token criptografado nunca vai ao navegador: os papéis do cliente (anon,
-- authenticated) não leem nem gravam a coluna; só o servidor (service role) mexe nela.
revoke all on channels from anon, authenticated;
grant select (id, owner_id, kind, external_id, display_name, token_expires_at, status, created_at, updated_at)
  on channels to authenticated;
grant update (display_name, status) on channels to authenticated;
grant delete on channels to authenticated;
-- O painel lê canais por esta view, sem a coluna do token.
create view channels_public with (security_invoker = true) as
  select id, owner_id, kind, external_id, display_name, token_expires_at, status, created_at
  from channels;
