# Ambiente de homologação do +1 KM

Este ambiente é separado da produção. Ele usa outro serviço de aplicação, outro banco MySQL e outro volume de mídia. Não restaure backup de produção aqui sem uma decisão explícita e um processo de anonimização.

## Arquitetura

- Aplicação: mesma imagem e código do repositório, com configuração de homologação.
- API: mesma árvore de rotas `/api`, sem alterar o domínio de produção.
- Banco: MySQL 8.4 isolado no volume `mais1km_staging_mysql_data`.
- Mídia: volume próprio `mais1km_staging_media`.
- Porta local padrão: 3001; no Easypanel, publicar por um domínio de homologação próprio.
- E-mail de contato/teste informado: `silvaromulo33@gmail.com`.

**Proibido compartilhar com produção:** `DATABASE_URL`, senha MySQL, `TAG_KEY_SECRET`, bucket/token R2, sessão/cookies, webhook n8n ou diretório de mídia.

## Preparação local ou em VPS com Docker Compose

1. Clone o repositório em uma pasta de homologação ou use uma cópia de trabalho separada. Não altere o checkout/serviço de produção.
2. Copie o modelo e gere segredos novos:

```bash
cp .env.staging.example .env.staging
openssl rand -hex 24
openssl rand -hex 32
```

Use uma senha URL-safe para `MYSQL_PASSWORD` e outra para `MYSQL_ROOT_PASSWORD`. Use um segredo aleatório de pelo menos 32 bytes para `TAG_KEY_SECRET`. Preencha também `DATABASE_URL` com o mesmo usuário/senha do MySQL e host `db-staging`. Não reutilize nenhum segredo da produção.

3. Configure `APP_PUBLIC_URL` com o domínio HTTPS exclusivo da homologação. Antes de publicar, configure também `CONTATO_EMAIL` e, se for necessário testar recuperação de senha, credenciais Resend de homologação.
4. Suba o ambiente:

```bash
docker compose --env-file .env.staging -f docker-compose.staging.yml config
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --build
docker compose --env-file .env.staging -f docker-compose.staging.yml ps
```

O primeiro comando valida a configuração interpolada. Revise a saída e não a compartilhe publicamente: ela pode conter segredos.

5. Confira a saúde:

```bash
curl --fail --show-error http://127.0.0.1:3001/api/saude
```

Esperado: resposta JSON com `ok: true` e `banco: "ok"`. A primeira inicialização pode levar alguns instantes enquanto o MySQL sobe e as migrações automáticas são aplicadas.

## Publicação no Easypanel

Crie recursos novos, sem editar ou reutilizar o serviço atual:

1. Novo serviço de aplicação chamado, por exemplo, `mais1km-staging`, apontando para o repositório e para uma branch de homologação.
2. Build usando o `Dockerfile` existente na raiz.
3. Novo MySQL 8.4 exclusivo, com banco e credenciais exclusivos.
4. Rede privada entre aplicação e banco; não exponha a porta MySQL publicamente.
5. Domínio HTTPS exclusivo, por exemplo `staging.seu-dominio` (confirme disponibilidade e DNS antes de usar).
6. Volume persistente exclusivo para `/data/media` se a mídia local for usada.
7. Variáveis do modelo `.env.staging.example` na seção Environment do serviço. Nunca coloque segredos em Build Args.
8. Configure `DATABASE_URL` apontando para o hostname interno do novo MySQL. Configure `APP_PUBLIC_URL` para o domínio de staging.

Não há como criar esses recursos remotamente apenas pelo repositório; a etapa depende do painel Easypanel e do DNS.

## Conta de teste

O e-mail solicitado para a conta de homologação é `silvaromulo33@gmail.com`. A conta deve ser criada pelo formulário normal de cadastro já no domínio de staging, depois que a API estiver no ar. Isso valida o fluxo real e evita gravar uma senha em código, arquivo ou histórico de chat.

Não cadastre a conta pela API de produção. Não solicite nem armazene a senha no repositório. Se o e-mail já existir na base isolada, use o fluxo de login ou recuperação de senha do próprio staging.

## Testes recomendados

- `GET /api/saude`: API e banco disponíveis.
- Cadastro e login com a conta de teste.
- `GET /api/conta/sessao`: cookie de sessão persistido no cliente.
- Logout e revogação da sessão.
- Recuperação de senha apenas depois de configurar envio de e-mail de staging.
- Catálogo, mapa e caderneta.
- Carimbo somente com ponto/tag de teste preparado para homologação; nunca usar tags reais de produção para testes que gravem dados.

## Operação

Ver logs:

```bash
docker compose --env-file .env.staging -f docker-compose.staging.yml logs -f app-staging
docker compose --env-file .env.staging -f docker-compose.staging.yml logs -f db-staging
```

Parar sem apagar dados:

```bash
docker compose --env-file .env.staging -f docker-compose.staging.yml down
```

**Não use** `docker compose down -v`: isso remove os volumes persistentes da homologação.

## Limites desta configuração

- O arquivo Compose prepara isolamento local/VPS, mas não cria DNS, serviço, banco ou domínio no Easypanel.
- Nenhum segredo real é versionado.
- A homologação começa sem Resend, Sentry, n8n, Google Maps ou R2 configurados. Ative integrações uma a uma, com credenciais e recursos exclusivos de staging.
- A base de homologação começa vazia; as migrações da aplicação criam a estrutura. Dados de produção não são copiados.
