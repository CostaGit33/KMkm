# Publicação na Google Play · +1 KM

Este checklist considera a arquitetura oficial **PWA + Android Capacitor**. O diretório `client/android` é a aplicação Android; o diretório `mobile/` contém a implementação Flutter histórica e não deve ser usado para a publicação oficial.

## Já implementado no código
- Política de privacidade pública em `/privacidade` e instruções de exclusão em `/excluir-conta`.
- Exclusão de conta no produto e endpoint correspondente no servidor.
- Cliente web/PWA compartilhado entre navegador e Capacitor.
- Package ID: `online.novaagencian8n.mais1km`.
- Capacitor 8.6.0; compileSdk/targetSdk 36; Gradle Wrapper 8.14.3; Java 21.
- Permissões Android para Internet, NFC e localização aproximada/precisa; NFC é recurso opcional do aparelho.
- App Links HTTPS para `/t/` e tratamento do link inicial e links recebidos no Capacitor.
- Workflow de validação PWA/Capacitor com APK debug para validação técnica.

**Presença no código não significa homologação em aparelho.** Login, cookies HttpOnly, GPS real, NFC, App Links verificados e paridade completa ainda precisam de testes físicos.

## Configurar assinatura

O workflow **Capacitor - Release Google Play** gera AAB e APK assinados e exige estes GitHub Actions Secrets:
- `ANDROID_KEYSTORE_BASE64`: arquivo JKS codificado em Base64.
- `ANDROID_KEYSTORE_PASSWORD`: senha do keystore.
- `ANDROID_KEY_ALIAS`: alias da chave.
- `ANDROID_KEY_PASSWORD`: senha da chave.

Gere a chave uma única vez em ambiente seguro:

```bash
keytool -genkeypair -v -storetype JKS -keystore mais1km-upload.jks -alias mais1km \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 mais1km-upload.jks
```

Guarde o JKS e as senhas em gerenciador de senhas e cópia offline. Nunca envie o JKS ao Git, bundle web, issue ou mensagem. Use Play App Signing: o secret contém a chave de upload. A impressão digital do certificado de upload é exibida no workflow. Para App Links da versão instalada pela Play, inclua também o SHA-256 do **certificado de assinatura do app** em Play Console → Integridade do app → Assinatura do app.

## Gerar release
1. Abra GitHub → Actions → **Capacitor - Release Google Play** → Run workflow.
2. Informe `version_code` inteiro maior que o último enviado à Play Console e `version_name` (por exemplo `1.0.0`).
3. O workflow instala dependências, executa testes do cliente, compila o bundle web Android, sincroniza o Capacitor, compila AAB/APK com assinatura obrigatória e gera checksums.
4. Baixe o artefato `mais1km-capacitor-release-...` e envie o AAB à faixa de teste interno antes de produção.

O workflow falha se algum secret estiver ausente ou se a assinatura não estiver configurada. Ele não publica automaticamente na Play Console.

## Digital Asset Links
Defina `ANDROID_SHA256_CERT_FINGERPRINTS` no backend para `/.well-known/assetlinks.json`, incluindo o certificado de assinatura do app gerenciado pela Play. Para testes de instalação direta, inclua também o certificado de upload se o APK estiver assinado por ele. Confirme o package ID exato `online.novaagencian8n.mais1km`. Não use fingerprint de debug ou de build temporário.

## Homologação ainda necessária
- Login, restauração de sessão, cookie HttpOnly, CSRF, chamadas autenticadas, logout e reinício em Android real.
- GPS preciso/aproximado, permissão negada, serviço desligado, timeout, precisão acima de 50 m e fora do raio.
- TAG NFC/QR e App Links após instalar build assinado; abertura no app e fallback no navegador.
- Câmera/QR, compartilhamento e notificações somente conforme necessidade real das jornadas. Push exige FCM, credenciais, registro de token, backend e teste; não está pronto só por haver integração opcional do Google Services.
- Ícone adaptativo, splash, barras de sistema, botão voltar, teclado, acessibilidade e diferentes densidades/tamanhos.
- Matriz de paridade de todas as páginas e fluxos PWA × Android.
- Conta Play Console, ficha da loja, Data Safety, classificação, público-alvo, suporte e credenciais de revisão.
- Requisito de teste fechado, se aplicável à conta, conforme a Play Console.

## Regras de lançamento
- Não usar APK debug como entrega comercial.
- Não commitar keystore, senhas, tokens ou certificados privados.
- Não declarar pronto para publicação enquanto houver testes obrigatórios sem execução ou falhas críticas abertas.
- Envio à Play Console e preenchimento de declarações são ações do titular da conta.