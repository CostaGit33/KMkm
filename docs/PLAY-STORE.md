# Publicação na Google Play · +1 KM

Checklist do que já está pronto no código e do que só você pode fazer.

## Já pronto no app
- Política de privacidade pública em `/privacidade` e instruções de exclusão de conta em `/excluir-conta` (a Play exige as duas URLs).
- Exclusão de conta dentro do app (Perfil → Excluir conta) e no servidor (`DELETE /api/eu`), que apaga carimbos, XP, ranking e sessões.
- Links para as duas páginas na tela de login e no Perfil.
- Tema escuro por padrão, sem conteúdo de demonstração, sem moedas, compras ou revenda (edição numerada e criaturas são gratuitas e intransferíveis).
- Cabeçalho HSTS em HTTPS, CSP sem script embutido, cookie de sessão HttpOnly.

## Variáveis do servidor (Easypanel)
- `CONTATO_EMAIL`: e-mail público que aparece nas páginas de privacidade e exclusão. Obrigatório antes de publicar.
- `DATABASE_URL`: mova para variável de ambiente de execução (fora dos build args) e **troque a senha do MySQL**, que apareceu em um log de build.

## O que você precisa fazer
1. **Conta de desenvolvedor Google Play** (taxa única) e, se for conta pessoal nova, o teste fechado com 12 testadores por 14 dias antes da produção.
2. **Empacotar como TWA** (Trusted Web Activity) com o Bubblewrap:
   ```bash
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest https://SEU-DOMINIO/manifest.webmanifest
   bubblewrap build
   ```
   Guarde o keystore em lugar seguro. Use o app bundle `.aab` na Play Console.
3. **Digital Asset Links**: depois do primeiro upload, copie o SHA-256 da chave de assinatura (Play Console → Integridade do app) e publique em `/.well-known/assetlinks.json` (coloque o arquivo em `client/public/.well-known/`).
4. **Ficha da loja**: ícone 512×512, imagem de destaque 1024×500, 4 a 8 capturas de tela, descrição curta e longa. Use fotos reais dos pontos, não imagens geradas por IA, para não representar mal lugares reais.
5. **Formulários da Play Console**: Segurança dos dados (nome, e-mail, atividade no app; sem venda de dados), classificação de conteúdo, público-alvo (não direcionado a crianças), URL da política de privacidade e URL de exclusão de conta.
6. Antes do lançamento rode `node server/scripts/teste-podio.js limpar` no servidor para apagar os participantes de teste do pódio.

## Testes antes de publicar
- `npm --prefix server test` (unitários).
- `BASE_URL=https://SEU-DOMINIO node server/scripts/smoke.mjs` (cria e apaga uma conta descartável).
- Coleção Postman em `postman/mais1km.postman_collection.json` (`newman run … --env-var baseUrl=https://SEU-DOMINIO`).
- Edição numerada (admin): `BASE_URL=… ADMIN_EMAIL=… ADMIN_SENHA=… node server/scripts/smoke.mjs --profundo`. Combine um horário: o card de teste ocupa 6 pontos durante a execução.
