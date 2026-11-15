-- Caixa de conversas: guarda o conteúdo do que foi enviado e permite envio manual.
alter table dispatches add column if not exists content jsonb;
alter table dispatches drop constraint if exists dispatches_kind_check;
alter table dispatches add constraint dispatches_kind_check
  check (kind in ('private_reply','public_reply','dm','wa','manual'));
create index if not exists dispatches_contact on dispatches (contact_id, sent_at desc);
