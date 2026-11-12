# Arquitetura: Mesa Farta Automação (reconstrução das funções centrais do ManyChat)

Lê: `replica/recon.md`, `replica/features.csv`. SQL: `replica/schema.sql`.

## Stack

| camada | escolha | por quê |
| --- | --- | --- |
| web | Next.js (App Router) + TypeScript | painel + rotas de API/webhook no mesmo projeto |
| estilo | Tailwind | tokens do `/replica-design` |
| banco | Postgres no Supabase | gerenciado, grátis para começar, RLS pronto |
| acesso ao banco | supabase-js (painel) + SQL com service role (webhooks) | simples; sem ORM no início |
| login | Supabase Auth (e-mail + senha / link mágico) | um só dono |
| APIs externas | Graph API do Instagram e WhatsApp Cloud API, via `fetch` | oficiais, com as suas chaves |
| jobs | Vercel Cron | renovar token IG 1x/dia |
| hospedagem | Vercel | HTTPS público: obrigatório para webhooks da Meta |
| pagamentos | nenhum | é uso próprio |

Um banco, um app. Nada de microsserviços.

## Schema

Tabelas: 6 (`channels`, `automations`, `automation_messages`, `contacts`,
`inbound_events`, `dispatches`) + 1 view (`channels_public`).
Acesso: **RLS do Supabase** para o painel; webhooks e cron usam a service role
só no servidor. Tokens da Meta ficam **criptografados** (AES-GCM, chave em
`TOKEN_ENCRYPTION_KEY`) e nunca vão ao navegador.

## API

| método rota | faz | quem | entrada | saída | fluxo |
| --- | --- | --- | --- | --- | --- |
| GET /api/meta/webhook | verificação do webhook (hub.challenge) | Meta | hub.mode, hub.verify_token, hub.challenge | challenge | — |
| POST /api/meta/webhook | recebe comentários/DMs/WhatsApp | Meta (assinatura validada) | payload | 200 rápido | F02 F03 F04 |
| GET /api/auth/instagram/start | inicia OAuth do Instagram | dono | — | redirect | F01 |
| GET /api/auth/instagram/callback | troca code → token longo, salva canal | dono | code, state | redirect S02 | F01 |
| POST /api/channels/whatsapp | salva phone_number_id + token do system user | dono | ids, token | canal | F01 |
| GET /api/instagram/posts | lista posts para escolher no editor | dono | channel_id | posts | F02 |
| ação server: salvar automação | cria/edita automação + mensagens | dono | form S05 | automação | F02–F04 |
| ação server: ativar/pausar | toggle | dono | id | ok | S04 |
| ação server: pausar robô no contato | humano assume | dono | contact_id | ok | F05 |
| ação server: responder no inbox | envio manual (dentro de 24h) | dono | contact_id, texto | ok | F05 |
| GET /api/cron/refresh-ig-tokens | renova tokens IG que expiram em <10 dias | Vercel Cron (CRON_SECRET) | — | resumo | — |

Webhooks de entrada: Instagram (`comments`, `messages`), WhatsApp (`messages`).
Webhooks de saída: nenhum.
Jobs: `refresh-ig-tokens`, diário às 06:00 UTC.

### O motor (dentro do POST do webhook)

1. Valida `X-Hub-Signature-256` com `META_APP_SECRET`. Inválido → 401.
2. Para cada evento: acha o canal por `(kind, external_id)`; ignora eventos
   do próprio negócio (eco / comentário do dono).
3. Upsert do contato; grava `inbound_events` com `on conflict do nothing`.
   Se já existia → para (webhook repetido).
4. Se `contacts.bot_paused` → para.
5. Normaliza o texto (minúsculas, sem acento) e acha a automação ativa de
   maior prioridade que casa (gatilho, post, palavra-chave).
6. Envia: resposta pública (opcional) → private reply / DM / WhatsApp,
   respeitando as janelas. Grava `dispatches`. Adiciona a tag.
7. Responde 200. Tudo em < 5 s; se falhar ao enviar, grava `failed` e
   segue (a Meta reenviaria o evento, mas o passo 3 evita duplicar).

## As partes que mordem

- **Idempotência:** a Meta reenvia webhooks. `unique (channel_id, external_event_id)` + índice de uma private reply por comentário.
- **Janelas da Meta:** DM só até 24 h após a última mensagem da pessoa; private reply uma vez, até 7 dias após o comentário; WhatsApp fora de 24 h só com template.
- **Tokens:** IG expira em 60 dias → cron renova; se falhar, canal vira `token_expired` e o painel avisa.
- **Laço infinito:** ignorar mensagens `is_echo` e comentários feitos pela própria conta.
- **Acentos:** "cardápio" e "cardapio" têm que casar → normalizar palavra e texto.
- **Rate limits:** volume de um negócio é baixo; registrar erro 429/613 em `dispatches.error`.
- **Fuso:** tudo `timestamptz` em UTC; o painel mostra em America/Sao_Paulo.
- **LGPD:** apagar contato apaga eventos/disparos (`on delete cascade`); política de privacidade publicada.

## Ordem de construção

1. **Fatia vertical:** login (S01) → conectar Instagram (S02) → automação
   "comentou PALAVRA → DM" hardcoded no banco → webhook + motor.
   Tabelas: `channels`, `automations`, `automation_messages`, `contacts`,
   `inbound_events`, `dispatches`. Prova a Meta de ponta a ponta.
2. **Must-haves:** editor de automação (S04, S05), DM do IG, WhatsApp,
   lista de contatos (S06), botões de link, cron de token.
3. **Should-haves:** resposta pública, tags, imagem, inbox e pausar robô
   (S08), templates WhatsApp (S09).
4. **Could-haves / fase 2:** painel com métricas, editor visual de fluxos,
   sequências com atraso.
5. **Correções** do `/replica-entrepreneur` (o que os usuários do ManyChat reclamam).
