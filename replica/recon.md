# Mapa de reconhecimento: ManyChat (web)

Escopo: automação por palavra-chave e comentário → DM, no Instagram Direct e no WhatsApp Business
Para: o Instagram da Aline Moriano (uso próprio, não SaaS). Nome do app: Ativa Aline
Data: 2026-11-12

> Clean-room: estudamos o que o ManyChat **faz** e como o usuário navega.
> Não copiamos código, logo, textos, templates nem a marca dele.
> Fontes: páginas públicas, central de ajuda e documentação pública da Meta.

## Fontes

| # | fonte | URL | o que dá |
| --- | --- | --- | --- |
| 1 | central de ajuda | https://help.manychat.com | lista de recursos, gatilhos, configurações |
| 2 | preços | https://manychat.com/pricing | o que é pago (Free x Pro) |
| 3 | site | https://manychat.com | o loop principal, nas palavras deles |
| 4 | Meta: Instagram Platform | https://developers.facebook.com/docs/instagram-platform | permissões, webhooks, private reply |
| 5 | Meta: WhatsApp Cloud API | https://developers.facebook.com/docs/whatsapp/cloud-api | envio, templates, janela de 24h |

## Loop principal

Alguém comenta uma palavra-chave num post/reel (ou manda na DM / no WhatsApp)
e recebe na hora uma mensagem automática com link, cupom ou cardápio, e vira
um contato com tags.

## Telas

| ID | tela | rota | propósito | componentes | estados |
| --- | --- | --- | --- | --- | --- |
| S01 | Login | /login | entrar | form, botão | vazio, erro |
| S02 | Conectar canais | /canais | ligar Instagram e WhatsApp | cards de canal, botão OAuth | não conectado, conectado, token expirado, erro de permissão |
| S03 | Painel | / | visão geral | KPIs, lista de automações | vazio (sem automação), preenchido |
| S04 | Lista de automações | /automacoes | criar/ativar/pausar | tabela, toggle, busca | vazio, preenchido |
| S05 | Editor de automação | /automacoes/:id | gatilho → ações | seletor de gatilho, palavras-chave, seletor de post, editor de mensagem, botões | rascunho, ativo, erro de validação |
| S06 | Contatos | /contatos | ver quem interagiu | tabela, tags, filtros | vazio, preenchido |
| S07 | Detalhe do contato | /contatos/:id | histórico e tags | timeline, tags, campos | — |
| S08 | Inbox | /inbox | conversa ao vivo / assumir do robô | lista de conversas, chat | vazio, janela 24h expirada |
| S09 | Templates WhatsApp | /whatsapp/templates | modelos aprovados pela Meta | lista, status | pendente, aprovado, rejeitado |
| S10 | Configurações | /config | conta, horário, mensagem padrão | form | — |

## Fluxos

```
F01 Conectar Instagram
    S02 -> OAuth Instagram (fora do app) -> S02 conectado
    cliques: 3
    borda: conta pessoal (precisa ser profissional), permissão negada, token expira em 60 dias

F02 Criar "comentou PALAVRA → recebe DM"
    S04 -> S05 escolher gatilho "comentário" -> post (ou todos) -> palavras-chave
        -> resposta pública opcional -> mensagem da DM com botão/link -> ativar
    cliques: ~8
    borda: palavra com acento/maiúscula, mesma pessoa comenta 2x, comentário >7 dias,
           uma só private reply por comentário

F03 Palavra-chave na DM do Instagram
    S05 gatilho "DM contém" -> resposta
    borda: fora da janela de 24h não pode mandar

F04 Palavra-chave no WhatsApp
    S05 gatilho "WhatsApp contém" -> resposta (texto, botões, lista)
    borda: iniciar conversa fora de 24h só com template aprovado

F05 Assumir conversa (humano)
    S08 abrir conversa -> pausar robô -> responder
```

## Componentes

| componente | variantes | estados | usado em |
| --- | --- | --- | --- |
| Botão | primário, secundário, perigo | normal, carregando, desabilitado | todas |
| Card de canal | Instagram, WhatsApp | desconectado, conectado, erro | S02 |
| Seletor de gatilho | comentário, DM, WhatsApp | — | S05 |
| Campo de palavras-chave | chips | vazio, preenchido | S05 |
| Editor de mensagem | texto, botões (até 3), imagem | — | S05 |
| Prévia de mensagem | IG, WhatsApp | — | S05 |
| Toggle ativo/pausado | — | on, off | S04 |
| Tabela | — | vazia, carregando, cheia | S04, S06 |
| Tag | — | — | S06, S07 |

## Modelo de dados inferido

```
Canal        id, tipo (instagram | whatsapp), conta_externa_id, nome, token (criptografado),
             token_expira_em, status            confiança: alta (doc Meta)
Automacao    id, nome, canal_id, gatilho (comentario | dm | whatsapp), post_id (opcional),
             palavras_chave[], correspondencia (contem | exata), resposta_publica (opcional),
             ativa, criada_em                   confiança: alta (ajuda ManyChat)
Mensagem     id, automacao_id, ordem, tipo (texto | imagem | botoes), conteudo (json)
Contato      id, canal_id, externo_id (IGSID / wa_id), nome, usuario, tags[],
             ultima_interacao_em               confiança: alta
Evento       id, contato_id, automacao_id, tipo (comentario | dm_recebida | dm_enviada),
             payload (json), criado_em          confiança: média (palpite)
Conversa     contato_id, robo_pausado, janela_expira_em  confiança: média
```

## O que não dá para clonar

- A marca, templates prontos e textos do ManyChat.
- A integração "parceira" deles com a Meta: você terá o **seu próprio** app na Meta.
- Fluxos de crescimento que dependem de recursos da Meta só para parceiros.

## Tamanho

10 telas, 5 fluxos, 6 entidades. Tamanho **M** (algumas semanas).
Partes difíceis: (1) webhooks da Meta e assinatura, (2) regras de janela
24h / private reply de 7 dias, (3) gestão de tokens (Instagram expira em 60 dias).

Próximo passo: `/replica-architect`.
