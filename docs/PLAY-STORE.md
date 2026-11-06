# Publicação na Google Play · +1 KM

Checklist do que já está pronto no código e do que só você pode fazer.

## Já pronto no app
- Política de privacidade pública em `/privacidade` e instruções de exclusão de conta em `/excluir-conta` (a Play exige as duas URLs).
- Exclusão de conta dentro do app (Perfil → Excluir conta) e no servidor (`DELETE /api/eu`), que apaga carimbos, XP, ranking e sessões.
- Links para as duas páginas na tela de login e no Perfil.
- Tema escuro por padrão, sem conteúdo de demonstração, sem moedas, compras ou revenda (edição numerada e criaturas são gratuitas e intransferíveis).
- Cabeçalho HSTS em HTTPS, CSP estrita para scripts (sem `unsafe-inline` nem `unsafe-eval`; estilos embutidos ainda são aceitos), cookie de sessão HttpOnly com `SameSite=Lax`.

## Variáveis do servidor (Easypanel)
- `CONTATO_EMAIL`: e-mail público que aparece nas páginas de privacidade e exclusão. Obrigatório antes de publicar.
- `ANDROID_SHA256_CERT_FINGERPRINTS`: SHA-256 do(s) certificado(s) do app Android, separados por vírgula (passo 3 abaixo). Sem ela, `/.well-known/assetlinks.json` responde 404.
- `ANDROID_PACKAGE_NAME` (opcional): pacote do app; padrão `online.novaagencian8n.mais1km`.
- `DATABASE_URL`: mova para variável de ambiente de execução (fora dos build args) e **troque a senha do MySQL**, que apareceu em um log de build.

## O que você precisa fazer
1. **Conta de desenvolvedor Google Play** (taxa única) e, se for conta pessoal nova, o teste fechado com 12 testadores por 14 dias antes da produção.
2. **Chave de assinatura e app bundle (Flutter)**. Gere a chave uma única vez:
   ```bash
   keytool -genkeypair -v -storetype JKS -keystore mais1km-release.jks -alias mais1km \
     -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 mais1km-release.jks   # macOS: base64 -i mais1km-release.jks
   ```
   Guarde o `.jks` e as senhas fora do repositório (gerenciador de senhas e uma cópia offline): perder a chave de upload complica toda atualização futura. Em GitHub → Settings → Secrets and variables → Actions crie `ANDROID_KEYSTORE_BASE64` (saída do `base64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`. Depois rode Actions → **Mobile - Release assinado** → *Run workflow*, baixe o artefato `mais1km-android-release-assinado` e envie o `.aab` à Play Console. O workflow falha de propósito se faltar algum secret e imprime o SHA-256 do certificado de upload. Build local (opcional): crie `mobile/android/key.properties` (ignorado pelo git) com `storeFile`, `storePassword`, `keyAlias` e `keyPassword` e rode `flutter build appbundle --release` na pasta `mobile/`.
3. **Digital Asset Links** (faz o toque na tag NFC abrir o app em vez do navegador). Com a Play App Signing, a Google reassina o app, então o que vale é o SHA-256 do *certificado de assinatura do app* (Play Console → Integridade do app → Assinatura do app). Se você também distribui o APK assinado com a chave de upload (teste interno), inclua o SHA-256 dela (o workflow imprime). Defina `ANDROID_SHA256_CERT_FINGERPRINTS` no Easypanel (valores separados por vírgula), reinicie o serviço e confira que `https://SEU-DOMINIO/.well-known/assetlinks.json` devolve JSON com o pacote `online.novaagencian8n.mais1km` e não a página do app. O servidor monta o arquivo a partir da variável; **não** coloque um arquivo em `client/public/.well-known/`, porque o servidor ignora essa pasta e entregaria o HTML do app, e a verificação falharia sem aviso. Sem a variável a rota responde 404.
4. **Ficha da loja**: ícone 512×512, imagem de destaque 1024×500, 4 a 8 capturas de tela, descrição curta e longa. Use fotos reais dos pontos, não imagens geradas por IA, para não representar mal lugares reais.
5. **Formulários da Play Console**: Segurança dos dados (nome, e-mail, atividade no app; sem venda de dados), classificação de conteúdo, público-alvo (não direcionado a crianças), URL da política de privacidade e URL de exclusão de conta.
6. Antes do lançamento rode `node server/scripts/teste-podio.js limpar` no servidor para apagar os participantes de teste do pódio.

## Testes antes de publicar
- `npm --prefix server test` (unitários).
- `BASE_URL=https://SEU-DOMINIO node server/scripts/smoke.mjs` (cria e apaga uma conta descartável).
- Contrato e coleção Postman em `docs/api/`: em produção rode só a pasta somente leitura (`newman run docs/api/mais1km.postman_collection.json --env-var baseUrl=https://SEU-DOMINIO --folder "1 · Saúde e páginas (somente leitura)"`); a coleção inteira cria e apaga uma conta de teste, então use em local ou homologação.
- Edição numerada (admin): `BASE_URL=… ADMIN_EMAIL=… ADMIN_SENHA=… node server/scripts/smoke.mjs --profundo`. Combine um horário: o card de teste ocupa 6 pontos durante a execução.
