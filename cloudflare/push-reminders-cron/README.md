# Pointer Push Reminders Cron

Worker isolado do Pointer para acionar os lembretes push em segundo plano.

## O que ele faz

- roda a cada 5 minutos no Cloudflare Workers Cron
- chama `GET /api/cron/push-reminders` no app do Pointer
- envia o header `Authorization: Bearer <CRON_SECRET>`

## Isolamento

Este worker deve ser publicado como recurso proprio do Pointer.

- nome sugerido: `pointer-push-reminders-cron`
- variaveis proprias
- secret proprio
- sem compartilhar com outros apps

## Como publicar

1. Copie o arquivo de exemplo:

```bash
cp cloudflare/push-reminders-cron/wrangler.toml.example cloudflare/push-reminders-cron/wrangler.toml
```

2. Faça login no Cloudflare:

```bash
npx wrangler login
```

3. Cadastre o secret do cron:

```bash
npx wrangler secret put CRON_SECRET --config cloudflare/push-reminders-cron/wrangler.toml
```

Use o mesmo valor configurado em `CRON_SECRET` ou `POINTER_CRON_SECRET` na Vercel do Pointer.

4. Publique o worker:

```bash
npx wrangler deploy --config cloudflare/push-reminders-cron/wrangler.toml
```

## Teste manual

Depois do deploy, voce pode abrir a URL do worker no navegador ou chamar via `curl`.

O worker vai responder com o JSON retornado por `/api/cron/push-reminders`.

## Observacoes

- iPhone precisa do app instalado na Tela de Inicio para receber push com o app fechado
- o endpoint do app precisa continuar acessivel em HTTPS
- o cron do Cloudflare substitui a necessidade de cron frequente na Vercel Hobby
