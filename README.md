# Pointer

Pointer e um MVP profissional de controle de ponto mobile-first, construído como PWA instalavel com Next.js 15, TypeScript estrito, Tailwind CSS, Prisma e PostgreSQL. O foco do produto e registrar ponto com o minimo de atrito, mantendo trilha de auditoria, foto obrigatoria, geolocalizacao e horario oficial validado pelo servidor.

## O que este MVP entrega

- Login seguro com email/senha, cookie httpOnly assinado e RBAC (`ADMIN` e `EMPLOYEE`)
- Registro de ponto com fluxo mobile-first
- Foto obrigatoria via camera do aparelho
- Compressao da imagem no cliente antes do upload
- Captura de geolocalizacao com validacao de politica
- Horario oficial sempre gerado pelo servidor
- Sequencia automatica de batidas do dia:
  - `ENTRY`
  - `BREAK_OUT`
  - `BREAK_IN`
  - `EXIT`
- Bloqueio de marcacoes acima do limite configurado
- Historico pessoal de registros
- Dashboard admin com indicadores iniciais
- Visualizacao administrativa de fotos, origem, horario e localizacao
- Exportacao CSV
- Envio automatico do relatorio mensal para o contador no dia 1
- Onboarding self-service para criar organizacao trial e admin inicial
- Checklist guiado de onboarding admin apos o trial
- Controle de plano, status e capacidade com bloqueio de limite de funcionarios
- Solicitacao interna de upgrade comercial dentro do painel admin
- Branding basico por organizacao com nome visual, logo e cores
- Fundacao de entrada por slug e preparo para subdominio por tenant
- Billing Stripe-ready com Checkout, portal e webhook
- Tabela de auditoria para login, logout, tentativa e conclusao de batida
- PWA com:
  - `manifest`
  - `service worker`
  - rota offline
  - CTA de instalacao para Android/Chrome
  - tutorial guiado para iPhone/Safari
  - endpoint seguro para cron mensal

## Arquitetura

O projeto foi desenhado para isolamento total.

- App independente: `pointer`
- Banco exclusivo sugerido: `pointer_db`
- Bucket exclusivo sugerido: `pointer-photos`
- Subdominio sugerido: `pointer.seudominio.com` ou `ponto.seudominio.com`
- Variaveis de ambiente dedicadas ao Pointer
- Build/deploy independente
- Sem reutilizar tabelas, buckets, segredos ou pipelines de outros projetos

## Preparado para comercializacao

Como voce pretende vender o Pointer no futuro, a base agora ja contempla fundamentos de SaaS sem exagerar na complexidade:

- `Organization` com `status`, `plan`, `maxEmployees` e `trialEndsAt`
- landing publica em `/` para apresentacao comercial do produto
- isolamento por organizacao desde o inicio
- relatorio mensal e configuracoes operacionais por tenant
- estrutura pronta para evoluir para onboarding, billing e provisionamento de novos clientes

O que isso facilita depois:

- trials por empresa
- controle de limite por plano
- suspensao de tenant sem afetar os demais
- expansao para onboarding self-service
- futura cobranca recorrente via integracao desacoplada

## Controles comerciais atuais

O Pointer agora ja aplica regras basicas de SaaS no proprio produto:

- ajuste de `plan`
- ajuste de `status`
- ajuste de `maxEmployees`
- bloqueio de cadastro de funcionario quando a capacidade do tenant e atingida
- visao de uso da capacidade no dashboard admin
- solicitacao de upgrade comercial com trilha de auditoria

Isso prepara o caminho para billing futuro sem acoplar o produto a um gateway neste momento.

## Billing Stripe-ready

O Pointer agora tem uma base inicial de billing inspirada no fluxo oficial da Stripe para SaaS:

- Checkout de assinatura por plano
- Portal do cliente
- Webhook para sincronizar assinatura
- registro de eventos de billing por organizacao
- fechamento automatico de solicitacoes de upgrade quando o plano e confirmado
- historico comercial e financeiro visivel no painel admin
- sincronizacao do ciclo atual da assinatura a partir dos itens da subscription
- listagem de faturas recentes com link hospedado e PDF
- tratamento de `invoice.paid` e `invoice.payment_failed` para refletir status financeiro
- janela de carencia para `PAST_DUE` e `INCOMPLETE` antes de suspender a organizacao

Arquivos principais:

- `src/lib/billing/stripe.ts`
- `src/services/billing-service.ts`
- `src/app/api/admin/billing/checkout/route.ts`
- `src/app/api/admin/billing/portal/route.ts`
- `src/app/api/stripe/webhook/route.ts`

Variaveis necessarias:

- `POINTER_STRIPE_SECRET_KEY`
- `POINTER_STRIPE_WEBHOOK_SECRET`
- `POINTER_STRIPE_PORTAL_CONFIG_ID`
- `POINTER_STRIPE_PRICE_STARTER`
- `POINTER_STRIPE_PRICE_PRO`
- `POINTER_STRIPE_PRICE_ENTERPRISE`
- `POINTER_BILLING_GRACE_DAYS`

Importante:

- use conta Stripe exclusiva do Pointer
- nao compartilhe produtos, clientes, webhooks ou segredos com outros sistemas

## Branding por tenant

O Pointer agora permite personalizacao basica por organizacao:

- `brandDisplayName`
- `brandLogoUrl`
- `brandPrimaryColor`
- `brandAccentColor`

Uso atual:

- exibicao da identidade do cliente no shell autenticado
- base pronta para evoluir para white-label parcial
- sem misturar a marca-mãe Pointer com infraestrutura compartilhada

## Slug e subdominio por tenant

O Pointer agora tem uma base funcional para acesso por slug:

- rota publica de tenant em `/t/[slug]`
- login dedicado em `/t/[slug]/login`
- gateway autenticado em `/t/[slug]/app`
- espelhos tenant-aware de `/admin` e `/employee`
- middleware preparado para reescrever `slug.seudominio.com` para essas rotas
- autenticacao com validacao opcional de `tenantSlug`

Configuracao de ambiente:

- `POINTER_ROOT_DOMAIN`

Exemplos:

- `acme.pointer.seudominio.com` -> reescreve para `/t/acme`
- `acme.pointer.seudominio.com/login` -> reescreve para `/t/acme/login`
- `acme.pointer.seudominio.com/app` pode apontar para o gateway autenticado do tenant
- `acme.pointer.seudominio.com/admin` e `acme.pointer.seudominio.com/employee` ja podem ser reescritos para rotas tenant-aware

No MVP atual, a area autenticada ainda continua centralizada em `/admin` e `/employee`, mas a fundacao publica de tenant ja esta pronta.

## Onboarding comercial

O Pointer agora tem uma rota publica de trial em `/signup`.

O fluxo cria:

1. uma `organization` nova e isolada
2. um admin inicial
3. sessao autenticada imediatamente apos o cadastro

Regras atuais:

- plano inicial `STARTER`
- status inicial `TRIAL`
- trial padrao de 14 dias
- capacidade inicial definida pela estimativa de equipe
- login bloqueado se a organizacao estiver `SUSPENDED`

Depois do cadastro, o admin encontra um checklist guiado no dashboard para:

- revisar politicas basicas
- cadastrar os primeiros funcionarios
- configurar o relatorio mensal para o contador
- concluir formalmente o onboarding da organizacao

### Camadas

- `src/app`: rotas, layouts, telas e route handlers
- `src/components`: componentes de UI, auth, PWA e ponto
- `src/lib`: auth, Prisma client, utilitarios, PWA e storage
- `src/services`: regras de negocio centrais
- `src/repositories`: acesso a dados com Prisma
- `src/validations`: schemas Zod
- `prisma`: schema e seed inicial

### Estrutura resumida

```text
pointer/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── sw.js
│   └── uploads/.gitkeep
├── src/
│   ├── app/
│   │   ├── (public)/login
│   │   ├── (public)/install
│   │   ├── (app)/employee
│   │   ├── (app)/admin
│   │   ├── api/auth/login
│   │   ├── api/auth/logout
│   │   ├── api/time-records
│   │   ├── api/reports/time-records
│   │   ├── manifest.ts
│   │   └── offline/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── repositories/
│   ├── services/
│   └── validations/
├── .env.example
├── middleware.ts
└── package.json
```

## Banco de dados

Schema Prisma com base preparada para multiempresa:

- `organizations`
- `users`
- `time_records`
- `work_schedules`
- `audit_logs`

Principios aplicados:

- `organizationId` nas entidades centrais
- organizacoes com status e plano para futura comercializacao SaaS
- horario do servidor armazenado em `serverTimestamp`
- horario do cliente opcional em `clientTimestamp`
- metadados da foto em JSON
- inconsistencias sinalizadas em `isInconsistent` e `inconsistencyReason`
- alteracoes futuras podem ser auditadas sem sobrescrita silenciosa

## Fluxo de autenticacao

1. Usuario envia email e senha para `/api/auth/login`
2. O backend valida com Zod
3. A senha e conferida com `bcryptjs`
4. A sessao e emitida em cookie httpOnly assinado com `jose`
5. O usuario e redirecionado por papel:
   - `ADMIN` -> `/admin`
   - `EMPLOYEE` -> `/employee`
6. `middleware.ts` protege rotas sensiveis

## Fluxo de bater ponto

1. Funcionario abre `/employee/record`
2. O app mostra a proxima marcacao esperada
3. O usuario tira a foto pela camera do aparelho
4. A imagem e comprimida no cliente
5. O app solicita geolocalizacao
6. O formulario envia `multipart/form-data` para `/api/time-records`
7. O backend:
   - valida sessao
   - valida input com Zod
   - valida tipo e tamanho da imagem
   - decide a proxima batida com base nos registros do dia
   - usa o horario do servidor como fonte oficial
   - salva foto e metadata
   - registra auditoria
8. O app exibe a confirmacao com horario oficial

## Regras de negocio implementadas

- Foto obrigatoria por padrao
- Geolocalizacao obrigatoria por padrao
- Sequencia padrao automatica de 4 batidas
- Bloqueio ao ultrapassar `maxRecordsPerDay`
- Inconsistencia quando a politica permitir falta de geolocalizacao
- Admin ve foto, origem e coordenadas
- Exportacao CSV inicial por organizacao

## PWA e instalacao

Implementacao atual:

- `src/app/manifest.ts`
- `src/app/icon.tsx`
- `src/app/apple-icon.tsx`
- `public/sw.js`
- `src/components/pwa/install-cta.tsx`
- `src/components/pwa/service-worker-registrar.tsx`

Comportamento:

- Android/Chrome:
  - escuta `beforeinstallprompt`
  - mostra CTA real de instalacao
- iPhone/Safari:
  - nao tenta instalacao automatica
  - mostra tutorial de `Compartilhar` -> `Adicionar a Tela de Inicio`
- Quando o app ja esta em modo standalone:
  - o CTA some

Offline:

- assets principais em cache
- pagina offline dedicada em `/offline`
- registro de ponto bloqueado sem internet para evitar falsa confirmacao

## Setup local

### 1. Instale dependencias

```bash
npm install
```

### 2. Configure o ambiente

Crie um `.env.local` a partir de `.env.example`.

Exemplo:

```bash
cp .env.example .env.local
```

Variaveis principais:

```env
DATABASE_URL="postgresql://pointer_user:pointer_password@localhost:5432/pointer_db?schema=public"
POINTER_APP_URL="http://localhost:3000"
POINTER_SESSION_SECRET="use-um-segredo-grande-e-exclusivo-do-pointer"
POINTER_STORAGE_DRIVER="local"
POINTER_STORAGE_LOCAL_DIR="public/uploads"
POINTER_SUPABASE_URL=""
POINTER_SUPABASE_SERVICE_ROLE_KEY=""
POINTER_SUPABASE_BUCKET="pointer-photos"
POINTER_EMAIL_FROM="Pointer <no-reply@pointer.local>"
POINTER_SMTP_HOST=""
POINTER_SMTP_PORT="587"
POINTER_SMTP_SECURE="false"
POINTER_SMTP_USER=""
POINTER_SMTP_PASSWORD=""
POINTER_CRON_SECRET="pointer-cron-secret-exclusivo"
POINTER_ADMIN_NAME="Admin Pointer"
POINTER_ADMIN_EMAIL="admin@pointer.local"
POINTER_ADMIN_PASSWORD="ChangeMe123!"
```

### 3. Suba um PostgreSQL isolado

Importante: use uma base exclusiva para o Pointer.

Sugestao:

- banco: `pointer_db`
- usuario: `pointer_user`
- senha dedicada

Atalho mais rapido para desenvolvimento local:

```bash
npm run setup:local
```

Esse comando:

- cria `.env.local` se ele ainda nao existir
- sobe um PostgreSQL isolado via `docker compose`
- executa `prisma generate`
- aplica o schema com `db push`
- roda o seed inicial do admin

### 4. Gere o client do Prisma

```bash
npm run prisma:generate
```

### 5. Crie a estrutura do banco

Opcao com migration:

```bash
npm run prisma:migrate -- --name init
```

Opcao rapida para MVP local:

```bash
npm run db:push
```

### 6. Popule o admin inicial

```bash
npm run prisma:seed
```

### 7. Rode o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Credenciais iniciais

As credenciais sao controladas por ambiente:

- `POINTER_ADMIN_EMAIL`
- `POINTER_ADMIN_PASSWORD`

Padrao do ambiente local:

- email: `admin@pointer.local`
- senha: `ChangeMe123!`

## Scripts uteis

```bash
npm run dev
npm run build
npm run start
npm run lint
npx prisma studio
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run push-cron:deploy
```

## Deploy isolado

### Recomendacao para este MVP: Opcao A

Opcao A e a mais simples, segura e operacionalmente leve para o Pointer:

- app em Vercel
- PostgreSQL exclusivo do Pointer
- storage exclusivo do Pointer
- subdominio proprio via Cloudflare

Por que recomendo:

1. Maior isolamento sem mexer em estruturas existentes
2. Menor risco de regressao em outros sistemas
3. Deploy e rollback muito simples
4. Melhor aderencia ao fluxo PWA e ao App Router do Next.js

### Opcao A sugerida

- Projeto Vercel: `pointer`
- Banco: `pointer_db`
- Storage: bucket `pointer-photos`
- Dominio: `pointer.seudominio.com`
- DNS Cloudflare apontando so para o subdominio do Pointer

### Opcao B

Tambem e valida quando voce quiser centralizar operacao no seu ambiente:

- app em container proprio na Hetzner
- reverse proxy proprio
- PostgreSQL exclusivo
- storage exclusivo
- subdominio proprio via Cloudflare

Cuidados da Opcao B:

- nao reutilizar container de outros apps
- nao compartilhar volume de uploads
- nao compartilhar `.env`
- nao compartilhar banco

## Storage de fotos

O MVP vem com driver local para facilitar desenvolvimento:

- pasta local: `public/uploads`

Para producao, a interface foi deixada preparada para trocar por storage dedicado:

- S3
- Supabase Storage em projeto exclusivo do Pointer
- Cloudinary dedicada ao Pointer

Opcao mais rapida para subir na Vercel sem tocar no Supabase antigo:

- `POINTER_STORAGE_DRIVER="cloudinary"`
- conta Cloudinary exclusiva do Pointer
- pasta dedicada, por exemplo `pointer/time-records`

Variaveis para esse caminho:

- `POINTER_CLOUDINARY_CLOUD_NAME`
- `POINTER_CLOUDINARY_API_KEY`
- `POINTER_CLOUDINARY_API_SECRET`
- `POINTER_CLOUDINARY_FOLDER`

Importante: nao reutilize bucket de outro projeto.

## Relatorio mensal para o contador

O Pointer agora suporta envio automatico do relatorio consolidado do mes anterior no dia 1.

Como funciona:

1. O admin informa o e-mail do contador em `Configuracoes`
2. O admin habilita o envio mensal
3. O cron chama `/api/cron/monthly-report`
4. O Pointer gera o consolidado do mes anterior
5. O sistema envia um e-mail com resumo e CSV em anexo
6. O envio fica auditado e evita duplicidade no mesmo mes

Arquivos principais:

- `src/app/api/cron/monthly-report/route.ts`
- `src/services/monthly-report-service.ts`
- `src/services/report-service.ts`
- `src/components/admin/report-settings-form.tsx`
- `vercel.json`

Configuracao de e-mail:

- use SMTP exclusivo do Pointer
- nao reutilize credenciais de outros sistemas
- se futuramente usar Supabase para qualquer coisa relacionada a storage, use projeto separado do Pointer

Agendamento atual:

- `0 11 1 * *`
- envia no dia 1 as 11:00 UTC
- em `America/Sao_Paulo`, isso corresponde a 08:00

## Lembretes push com app fechado

O Pointer ja possui Web Push no app e endpoint proprio para envio de lembretes:

- `GET /api/cron/push-reminders`

Como a Vercel Hobby nao permite cron frequente, o caminho gratuito recomendado e um Worker isolado no Cloudflare com Cron Trigger.

Arquivos:

- [index.ts](/Users/jeffersonreis/Documents/Pointer/cloudflare/push-reminders-cron/src/index.ts)
- [wrangler.toml.example](/Users/jeffersonreis/Documents/Pointer/cloudflare/push-reminders-cron/wrangler.toml.example)
- [README.md](/Users/jeffersonreis/Documents/Pointer/cloudflare/push-reminders-cron/README.md)

Passos:

1. Copie o arquivo de configuracao:

```bash
cp cloudflare/push-reminders-cron/wrangler.toml.example cloudflare/push-reminders-cron/wrangler.toml
```

2. Faça login no Cloudflare:

```bash
npx wrangler login
```

3. Grave o secret do Worker:

```bash
npx wrangler secret put CRON_SECRET --config cloudflare/push-reminders-cron/wrangler.toml
```

Use exatamente o mesmo valor configurado em `CRON_SECRET` ou `POINTER_CRON_SECRET` no app publicado do Pointer.

4. Publique:

```bash
npm run push-cron:deploy
```

5. Se quiser acompanhar logs:

```bash
npm run push-cron:tail
```

Variavel publica do Worker:

- `POINTER_APP_URL=https://pointer.voxeflow.com`

Observacoes:

- mantenha esse Worker separado de qualquer outro recurso do Cloudflare
- iPhone so recebe push com o app fechado se o Pointer estiver instalado na Tela de Inicio

## Seguranca aplicada

- hash de senha com `bcryptjs`
- cookie de sessao assinado com `jose`
- validacao de input com Zod
- RBAC em paginas e APIs
- rate limit simples em login
- validacao de MIME e tamanho da imagem
- auditoria de login, logout, tentativa e batida concluida

## Checklist de testes

### Funcionario

- Login com credenciais validas
- Bloqueio com senha invalida
- Registro da `ENTRY` com foto e geolocalizacao
- Bloqueio sem foto
- Bloqueio sem geolocalizacao quando obrigatoria
- Confirmacao com horario do servidor
- Sequencia correta ate `EXIT`
- Bloqueio na quinta tentativa do dia
- Visualizacao do historico pessoal
- UX de instalacao Android
- Tutorial de instalacao iPhone

### Admin

- Acesso permitido apenas para `ADMIN`
- Dashboard carregando indicadores
- Lista de funcionarios
- Tela de registros com foto e localizacao
- Exportacao CSV
- Visualizacao individual do funcionario

### PWA

- Manifest carregando corretamente
- Service worker registrado
- App abrindo em standalone quando instalado
- Pagina offline aparecendo sem internet
- Bloqueio de batida offline sem falsa confirmacao

### Banco e auditoria

- Seed criando organizacao e admin
- Insercao de `time_records`
- Insercao de `audit_logs`
- Consistencia do `organizationId`

## Proximos passos recomendados

- troca do storage local por bucket dedicado de producao
- onboarding admin para criar funcionarios
- filtros reais por periodo e funcionario nos relatorios
- ajuste manual auditado
- geofence por unidade
- reconhecimento facial opcional
- notificacoes e fechamento de jornada

## Validacao executada

Antes da entrega, este projeto foi validado com:

```bash
npm run lint
npm run build
npx prisma generate
```

## Observacao importante

Este MVP foi montado para nascer isolado. A recomendacao deliberada e manter tudo novo e independente do que ja existe em producao. Se voce quiser, no proximo passo eu posso continuar com:

1. CRUD administrativo de funcionarios
2. filtros completos de relatorio
3. troca do storage local por Supabase Storage ou S3 exclusivos do Pointer
4. pipeline de deploy para Vercel ou Hetzner sem tocar nos outros projetos
