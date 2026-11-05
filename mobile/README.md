# Mais1km — Android (Flutter)

Aplicativo Android Flutter desenvolvido em paralelo à PWA existente. Usa o mesmo backend, domínio e banco; não configure outro serviço para o app.

## API e sessão

- Base URL: `https://mais1km.novaagencian8n.online` (produção).
- Prefixo da API: `/api`.
- Sessão: cookie `mais1km_session` persistido com `flutter_secure_storage`.
- Login, cadastro, solicitação de recuperação, redefinição por App Link, restauração de sessão e logout.
- Perfil: atualização de nome/e-mail/senha e solicitação de exclusão de conta, com confirmação.
- Catálogo público (somente pontos publicados e não ocultos), busca, categorias, rotas e caderneta.
- Pódio/XP, medalhas e participação pública opcional.
- Carimbo por leitura NFC NDEF dentro do app, App Link ou link colado; a localização é solicitada apenas quando a API exige validação do ponto.
- Leitura NFC aceita registros NDEF URI e texto contendo URL. A TAG precisa estar gravada com o link completo `/t/<código>?k=<chave>`; o app não consegue ler uma TAG vazia ou sem NDEF.

A redefinição de senha usa o link HTTPS `/?redefinir=TOKEN` enviado por e-mail. O Android valida domínio, caminho e formato do token; mantém o token apenas em memória e o envia uma única vez ao endpoint do servidor. Após sucesso, a sessão local é apagada porque o backend revoga todas as sessões. As telas completas de eventos ainda precisam ser comparadas/implementadas. Os testes de contrato usam servidor local falso; não chamam a produção.

## Mapas

O mapa mantém OpenStreetMap como fallback padrão, com tiles servidos pelo Mais1km e atribuição visível. Google Maps nativo é opcional para Android e só é escolhido quando o build define `GOOGLE_MAPS_ENABLED=true` e `MAPS_API_KEY_CONFIGURED=true`, além de fornecer a chave Android em `MAPS_API_KEY`. Builds sem chave continuam funcionando em OSM.

A chave Google não pode ser commitada nem reutilizada da PWA. Restrinja-a no Google Cloud ao package `online.novaagencian8n.mais1km`, às APIs usadas e aos certificados Android adequados (debug/release têm fingerprints diferentes). O Gradle recebe a chave pela propriedade `-PMAPS_API_KEY=...` ou pela variável de ambiente `MAPS_API_KEY`; o Manifest usa placeholder e o Dart define apenas se a chave foi configurada.
Para aplicar o estilo Cloud do Google Maps também usado pela PWA, informe o Map ID compatível com Android por `--dart-define=GOOGLE_MAP_ID=...`. O Map ID não substitui a chave Android e pode ser omitido; sem ele, o Google Maps usa o estilo padrão.

Exemplo local de teste com chave já fornecida pelo ambiente, na pasta `mobile/`:

```bash
: "${MAPS_API_KEY:?Configure MAPS_API_KEY no ambiente antes de habilitar Google Maps}"
flutter run \
  --dart-define=GOOGLE_MAPS_ENABLED=true \
  --dart-define=MAPS_API_KEY_CONFIGURED=true
```

## App Links e carimbo

O filtro Android aceita `https://mais1km.novaagencian8n.online/t/...`. A verificação do domínio depende de hospedar `/.well-known/assetlinks.json` com o applicationId e SHA-256 do certificado correto. O Manifest não substitui essa publicação. Sem verificação, use link colado dentro do app como alternativa.

O app só solicita permissão de localização após o backend responder `localizacao_necessaria`. A API valida precisão de GPS de até 50 metros e o raio do ponto. A coordenada não é coletada em segundo plano nem antes da ação do usuário. O link pode conter uma chave privada do ponto: não registre nem compartilhe a URL completa.

## Executar e validar

Na pasta `mobile/`:

O botão **Ler TAG agora** abre uma sessão NFC em primeiro plano. Mantenha o celular desbloqueado e aproxime a região da antena NFC da TAG. Se o Android não suportar NFC ou a TAG não tiver um registro NDEF com URL Mais1km, o app informa o motivo e mantém a opção de colar o link.

```bash
flutter pub get
flutter analyze --fatal-infos
flutter test --reporter expanded
flutter run
```

APK local:

```bash
flutter build apk --debug
flutter build apk --release
```

O workflow `.github/workflows/mobile.yml` executa dependências, análise estática, testes, builds debug e release e publica APKs com checksum SHA-256 como artefatos temporários do GitHub Actions.

**Atenção à assinatura:** o Gradle ainda assina o build release com a chave debug padrão. Esse APK é adequado para instalação e teste controlado, mas não para Google Play nem para atualização contínua entre builds de CI (a chave debug do runner é temporária). Para distribuição pública, será necessário configurar uma chave de assinatura permanente em GitHub Secrets, sem versioná-la no repositório, e publicar `assetlinks.json` com o fingerprint correspondente.

## Segurança e teste manual

- O app chama a API de produção; use uma conta descartável e não carimbe pontos reais sem autorização.
- Não registrar senha, cookie, chave NFC, token de recuperação ou coordenadas em logs.
- Não implementar fila offline de carimbos.
- A persistência da sessão após reiniciar, revogação remota do logout, GPS, NFC/QR e verificação de App Links ainda precisam de teste em aparelho/emulador. Nenhuma publicação na Play Store está incluída.
