# Auditoria inicial — Capacitor e preparação Google Play

**Branch:** `feat/capacitor-playstore-hardening`  
**Base:** `feat/retomar-capacitor-android`  
**Escopo:** endurecimento de release e correção de documentação contraditória. Não representa homologação integral nem aprovação da Play Store.

## Evidências encontradas
- `client/package.json` já contém Capacitor 8.6.0, App 8.1.2 e Geolocation 8.2.4.
- `client/capacitor.config.json` define o package ID `online.novaagencian8n.mais1km`, `webDir: dist`, esquema HTTPS local e suporte de cookies/HTTP.
- `client/src/main.js` trata `appUrlOpen` e `getLaunchUrl` para links de TAG e desativa o Service Worker em plataforma nativa.
- `client/src/tag.js` solicita GPS nativo somente no fluxo de carimbo e diferencia localização negada, GPS impreciso e fora do raio.
- `client/android/variables.gradle` já define compileSdk/targetSdk 36, minSdk 24 e versões AndroidX.
- O manifesto declara Internet, NFC, localização aproximada/precisa, NFC opcional e App Links para `/t/`.
- `docs/capacitor/README.md` reconhece que cookies HttpOnly, autenticação, GPS real e App Links ainda dependem de validação em aparelho.

## Alterações desta etapa
- Gradle recebe `versionCode` e `versionName` por variáveis de ambiente.
- Assinatura release é configurável por variáveis de ambiente; `REQUIRE_ANDROID_RELEASE_SIGNING=true` bloqueia builds release sem todos os dados.
- Manifesto desativa backup automático e tráfego HTTP cleartext.
- Workflow manual gera AAB/APK assinados, valida versão e secrets, imprime fingerprint do certificado e publica checksums; keystore temporário é removido ao final.
- README e checklist da Play Store passam a descrever Capacitor como implementação Android oficial.

## Pendências reais

| Área | Situação | Evidência / próxima ação |
|---|---|---|
| AAB assinado | Preparado, não executado | Requer quatro GitHub Secrets e execução do workflow. |
| Login e sessão | Não homologado | Testar cookie HttpOnly, CSRF, operações autenticadas, reinício e logout em aparelho. |
| App Links | Configurado no código, não homologado | Validar assetlinks com certificado da Play e instalação via faixa interna. |
| NFC | URL NFC depende de App Links; NDEF bruto não implementado | Testar TAGs físicas; QR segue fluxo web. |
| GPS | Implementado no cliente, não homologado | Testar permissões, precisão, timeout, serviço desligado e geofence em aparelho. |
| Câmera/QR nativo | Não comprovado | Mapear jornada e adicionar plugin apenas se a solução web não cobrir. |
| Push | Não ponta a ponta | Exige FCM, credenciais, registro de token, backend e testes. |
| Offline | PWA tem Service Worker; Capacitor usa assets embarcados | Testar rede indisponível/reconexão e garantir que carimbo offline não seja confirmado. |
| Paridade | Parcialmente documentada | Criar matriz de cada página, estado e jornada no navegador e Android. |
| Play Console | Dependência externa | Conta, ficha, Data Safety, classificação, política, suporte e faixa de teste. |

## Limites desta etapa

Não houve acesso a aparelho Android físico, Play Console ou GitHub Secrets. Nenhum teste real de NFC/GPS/App Links autenticados nem AAB assinado foi declarado concluído. Não houve alteração de API, banco, migrations, produção ou regras de carimbo.