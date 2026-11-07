# Prioridade do APK ao abrir links de TAG (Android App Links)

## Objetivo

Quando o aplicativo Mais1km estiver instalado e o Android reconhecer o domínio como associado ao pacote, abrir diretamente o APK ao tocar em links HTTPS `/t/`, sem apresentar o seletor APK/navegador.

O Android não permite forçar a abertura do aplicativo quando ele não está instalado ou quando o usuário desativou a abertura de links suportados. O mecanismo correto é Android App Links verificado, não redirecionamento JavaScript.

## Configuração já presente no APK

O manifesto `client/android/app/src/main/AndroidManifest.xml` declara:

- `https`
- domínio `mais1km.novaagencian8n.online`
- prefixo `/t/`
- `android:autoVerify="true"`
- pacote `online.novaagencian8n.mais1km`

A configuração nativa está correta. O ponto decisivo é o servidor publicar o fingerprint exato do certificado que assinou o APK instalado.

## Fingerprint do APK de teste físico

O fingerprint informado após a geração do APK debug é:

```
6B:18:22:8D:CA:A8:4C:27:6A:FB:EC:C3:11:20:FA:94:3E:56:59:E0:B8:51:97:9A:87:BB:71:C7:37:15:66:62
```

Ele corresponde somente ao APK debug daquela execução. Builds debug futuros do GitHub Actions podem usar outra chave de depuração, porque os runners são efêmeros. Não tratar este SHA como certificado definitivo da Google Play.

## Configuração necessária no serviço backend (EasyPanel)

No serviço que executa o backend Node/Express do Mais1km, adicionar/atualizar a variável:

- Nome: `ANDROID_SHA256_CERT_FINGERPRINTS`
- Valor para validar este APK de teste: o fingerprint acima, com ou sem dois-pontos.

Manter também:

- `ANDROID_PACKAGE_NAME=online.novaagencian8n.mais1km`

Salvar e fazer redeploy/restart do serviço backend para carregar a variável.

O backend já possui a rota `GET /.well-known/assetlinks.json`, montada antes do static/fallback da SPA. Ela responde JSON com `Content-Type: application/json` quando há fingerprint configurado e 404 quando a variável está vazia.

## Verificação após o redeploy

Abrir:

`https://mais1km.novaagencian8n.online/.well-known/assetlinks.json`

Conferir:

1. HTTP 200, sem redirecionamento para login ou HTML da SPA.
2. `Content-Type: application/json`.
3. `relation` contém `delegate_permission/common.handle_all_urls`.
4. `target.package_name` é `online.novaagencian8n.mais1km`.
5. `sha256_cert_fingerprints` contém o fingerprint do APK instalado.

No Android, depois de o domínio ser verificado, conferir em Configurações → Aplicativos → Mais1km → Abrir por padrão / Abrir links compatíveis (o nome varia por fabricante) se a abertura de links suportados está habilitada. Em seguida, tocar em um link real `https://mais1km.novaagencian8n.online/t/...` e confirmar que o app abre diretamente.

Se o Android já armazenou a decisão anterior, reinstalar o APK ou redefinir a preferência de links do app e repetir o teste. A verificação do sistema pode levar algum tempo após a publicação do JSON.

## Certificado definitivo da Play Store

Quando a aplicação for distribuída pela Google Play com Play App Signing, adicionar ao mesmo `ANDROID_SHA256_CERT_FINGERPRINTS` o SHA-256 do **certificado da chave de assinatura do app** exibido em Play Console → Integridade do app. Não usar apenas o certificado de upload. É possível manter vários fingerprints separados por vírgula, incluindo o de teste e o definitivo, enquanto necessário.

## Limite importante

A associação verificada faz o Android preferir/abrir o app instalado para URLs compatíveis. Ela não instala o APK, não ignora escolhas explícitas do usuário, não sobrepõe links de outros domínios e não garante abertura no app se o certificado do APK não corresponder ao JSON publicado.
