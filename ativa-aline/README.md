# Ativa Aline

Automação do Instagram (e WhatsApp) da Aline Moriano, no estilo ManyChat:
quem **comenta** ou **manda mensagem** com uma palavra-chave recebe uma
resposta automática no direct / WhatsApp.

- Painel com senha: automações, contatos (com etiquetas), canais, últimos envios.
- Gatilhos: comentário em post do Instagram, Direct do Instagram, WhatsApp.
- Respostas: texto, texto + botões de link, imagem; resposta pública no comentário.
- Respeita as regras da Meta: 1 mensagem por comentário, janela de 24 h, ignora
  as próprias mensagens, não responde duas vezes ao mesmo evento.
- Tokens da Meta guardados criptografados; o do Instagram renova sozinho.

## Colocar no ar (uma vez)

1. **Banco:** crie um projeto grátis no [Supabase](https://supabase.com).
   Copie a *connection string* do **pooler** (porta 6543) e rode:
   `DATABASE_URL="..." npm run db:migrate`
2. **Hospedagem:** importe este repositório na [Vercel](https://vercel.com),
   com *Root Directory* = `ativa-aline`. Cadastre as variáveis do `.env.example`.
   Gere as chaves com `openssl rand -hex 32`.
3. **Meta:** siga `../replica/meta-autorizacao.md`. Use:
   - URL de redirecionamento do OAuth: `https://SEU-APP.vercel.app/api/auth/instagram/callback`
   - URL de callback dos webhooks: `https://SEU-APP.vercel.app/api/meta/webhook`
   - Token de verificação: o mesmo de `META_WEBHOOK_VERIFY_TOKEN`
4. Entre no painel → **Canais** → **Conectar Instagram** (a Aline faz o login dela).
5. **Automações** → **Nova automação**.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha
npm run dev
npm test                     # testes do motor
```
