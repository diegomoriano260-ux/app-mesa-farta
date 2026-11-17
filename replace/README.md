# Replace

Junta o melhor do **Tactiq** (transcrição + resumo) e do **WayinVideo** (clipes curtos com IA):

1. Escolha um vídeo ou áudio longo (live, aula, podcast, reunião).
2. O navegador separa o áudio (ffmpeg.wasm). O vídeo não sai do aparelho.
3. A transcrição é feita pela OpenAI (whisper-1), em partes de 10 minutos.
4. O Claude (claude-opus-5-5) faz resumo, tópicos, pontos-chave, ações e escolhe 3 a 10 clipes.
5. O navegador gera cada clipe vertical 9:16 (720x1280) com legenda estilo Reels, pronto para baixar.

Também baixa a transcrição em TXT e SRT. Os projetos ficam salvos no navegador (IndexedDB).

## Variáveis de ambiente (Vercel)

| nome | o quê |
| --- | --- |
| `DATABASE_URL` | Postgres (pode ser o mesmo Supabase do Ativa Aline; tabelas `rp_`) |
| `APP_URL` | endereço do site, ex.: https://replace-cyan.vercel.app |
| `ADMIN_PASSWORD` | senha do administrador (entre com o e-mail `admin`) |
| `MP_ACCESS_TOKEN` | Access Token de produção do Mercado Pago (vendas de créditos) |
| `SESSION_SECRET` | 32+ caracteres aleatórios |
| `OPENAI_API_KEY` | chave da OpenAI (transcrição) |
| `ANTHROPIC_API_KEY` | chave da Anthropic (resumo e clipes) |
| `REPLICATE_API_TOKEN` | chave do Replicate (super-resolução Topaz, opcional) |
| `BLOB_READ_WRITE_TOKEN` | criada ao ligar o Vercel Blob (envio do clipe para a IA) |

## Desenvolvimento

```bash
npm install      # também copia o ffmpeg para public/ffmpeg
npm run dev
npm test
```
