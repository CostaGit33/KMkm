# Mais1km — Android (Flutter)

Aplicativo Android nativo em Flutter, desenvolvido em paralelo à PWA existente.

## API

- Base URL: `https://mais1km.novaagencian8n.online`
- Prefixo: `/api`
- Backend e MySQL: os mesmos usados pelo site.
- Sessão: cookie HttpOnly `mais1km_session`, protegido no Android por `flutter_secure_storage`.

Não configure outro domínio, serviço ou banco para o aplicativo.

## Implementado

- Login: `POST /api/conta/entrar`.
- Cadastro: `POST /api/conta/criar`.
- Solicitação de recuperação: `POST /api/conta/recuperar-senha`.
- Restauração de sessão: `GET /api/conta/sessao`.
- Logout: `POST /api/conta/sair`.
- Cookie de sessão persistido em armazenamento seguro.
- Tratamento de erros HTTP, rede e timeout.
- Tela inicial autenticada.
- Catálogo público e circuitos carregados da API, com filtro de pontos publicados e não ocultos.
- Busca por nome/código/endereço e filtro por categoria.
- Detalhe do ponto com endereço, descrição e categorias.
- Mapa nativo com marcadores dos pontos georreferenciados, seleção de ponto e ajuste inicial para enquadrar os marcadores.
- Mapa utiliza o endpoint de tiles já existente na API e atribuição OpenStreetMap.

A redefinição por token/deep link será implementada após confirmar o formato do link enviado pelo backend.

## Executar

Na pasta `mobile/`:

```bash
flutter pub get
flutter analyze --fatal-infos
flutter test
flutter run
```

APK debug:

```bash
flutter build apk --debug
```

## Segurança

- Não registrar senha, cookie, chave NFC, token de recuperação ou coordenadas em logs.
- Não implementar carimbo offline.
- Operações de escrita alteram dados compartilhados com o site. Não usar cadastro, carimbo ou exclusão para testes sem conta/ponto de teste autorizado.
