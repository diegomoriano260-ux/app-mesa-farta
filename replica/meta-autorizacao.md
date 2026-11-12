# Autorização da Meta: passo a passo (uso próprio)

**Boa notícia:** como o app é só para o **seu próprio negócio**, você **não
precisa de App Review** nem de "Advanced Access". A Meta diz isso na
documentação oficial:

- Instagram: se o app atende só contas profissionais que você possui ou
  gerencia, o **Standard Access** basta, sem App Review.
- WhatsApp: desenvolvedor direto que acessa só dados do próprio negócio não
  passa por App Review nem precisa de Advanced Access.

App Review + verificação da empresa só serão necessários se um dia você
quiser **vender** o app para outras empresas conectarem as contas delas.

Ninguém consegue pedir essa autorização por você: tudo abaixo é feito na sua
conta Meta. Confira sempre o painel do app, porque a Meta muda os nomes.

---

## 0. Pré-requisitos

- [ ] Conta **profissional** (Business ou Criador) no Instagram.
- [ ] Um **Portfólio empresarial** (antigo Gerenciador de Negócios) em business.facebook.com.
- [ ] Um **número de telefone** para o WhatsApp que **não** esteja em uso no app
      WhatsApp/WhatsApp Business (ou que você aceite migrar para a API).
- [ ] Uma conta em developers.facebook.com.
- [ ] Uma URL pública de **política de privacidade** (pode ser uma página simples).

## 1. Criar o app na Meta

1. developers.facebook.com → **Meus apps** → **Criar app**.
2. Caso de uso: escolha **"Gerenciar mensagens e conteúdo no Instagram"** e
   **"Conectar-se com clientes pelo WhatsApp"** (adicione os dois casos de uso).
3. Vincule ao seu **Portfólio empresarial**.

## 2. Instagram (API com Login do Instagram)

1. No app → caso de uso Instagram → **Configuração da API com login do Instagram**.
2. Adicione a sua conta do Instagram como **testador do Instagram** (Funções do app)
   e aceite o convite no Instagram: Configurações → Apps e sites → Convites de testador.
3. Permissões a ativar:
   - `instagram_business_basic`
   - `instagram_business_manage_messages` (receber/enviar DMs)
   - `instagram_business_manage_comments` (ler comentários e mandar *private reply*)
4. **Webhooks**: URL de callback do seu servidor + token de verificação.
   Assine os campos `comments` e `messages`.
5. No Instagram: Configurações → Mensagens → **Permitir acesso às mensagens** (ligado).
6. Gere o token. O token de longa duração dura **60 dias**: o app vai renová-lo sozinho.

Regras que o app respeita:
- *Private reply*: **uma** por comentário, até **7 dias** depois do comentário.
- DM: você só responde até **24 h** depois da última mensagem da pessoa.

## 3. WhatsApp (Cloud API)

1. No app → caso de uso WhatsApp → **Configuração da API**.
2. Adicione e verifique o **seu número** (SMS ou ligação).
3. No Portfólio empresarial → **Usuários do sistema** → crie um usuário do
   sistema **administrador**, atribua o app e a conta do WhatsApp (WABA), e gere
   um **token permanente** com:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. **Webhooks**: mesma URL de callback, assine o campo `messages`.
5. Cadastre uma **forma de pagamento** na WABA (a Meta cobra por conversa/mensagem
   fora da janela gratuita).
6. Para falar com alguém **depois de 24 h**, só com **template aprovado**
   (crie em Gerenciador do WhatsApp → Modelos de mensagem).

## 4. Guardar os segredos

Nunca coloque tokens no código nem no GitHub. No servidor, como variáveis de ambiente:

```
META_APP_ID=
META_APP_SECRET=          # valida a assinatura X-Hub-Signature-256 dos webhooks
META_WEBHOOK_VERIFY_TOKEN=
IG_ACCESS_TOKEN=
WA_ACCESS_TOKEN=          # token do usuário do sistema
WA_PHONE_NUMBER_ID=
WA_BUSINESS_ACCOUNT_ID=
```

## 5. Teste de fumaça

- [ ] Comentar a palavra-chave num post seu (com **outra** conta) → chega a DM.
- [ ] Mandar a palavra-chave na DM → chega a resposta.
- [ ] Mandar a palavra-chave no WhatsApp → chega a resposta.

## Se um dia virar SaaS

Aí sim: **verificação da empresa**, **Advanced Access** para as permissões
acima, **App Review** com vídeo de demonstração, e no WhatsApp virar
**Tech Provider** com *Embedded Signup*.

Fontes:
- https://developers.facebook.com/docs/instagram-platform/app-review
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
- https://developers.facebook.com/documentation/business-messaging/whatsapp/permissions
