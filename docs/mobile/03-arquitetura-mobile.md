# Arquitetura proposta do cliente Android — Mais1km

**Status:** autenticação, catálogo/circuitos, mapa nativo e primeira paridade da Caderneta (início, rotas, coleção e eventos) implementados; pódio, perfil, ficha completa, NFC/QR e certificados ainda pendentes.
**Regra central:** o servidor existente é a fonte da verdade para conta, catálogo, carimbo, evento, coleção e gamificação.

## Visão lógica

```mermaid
flowchart LR
  P[Participante Android] --> F[App Flutter]
  W[Participante Web] --> PWA[PWA existente]
  F -->|HTTPS /api| API[API Node.js existente]
  PWA -->|HTTPS /api| API
  API --> AUTH[Contas e sessões]
  API --> DOM[Catálogo, tags, carimbos, eventos, gamificação]
  API --> DB[(MySQL existente)]
```

O aplicativo e a PWA compartilham o mesmo serviço de API e o mesmo MySQL. Não criar outro domínio, serviço, banco ou volume para o Android. O app não acessa MySQL diretamente nem replica regras de negócio.

## Camadas implementadas

- **App:** entry point, tema visual, tela de autenticação e área inicial autenticada.
- **Core API:** cliente HTTPS com `dart:io HttpClient`, timeout e tratamento de rede/HTTP.
- **Core auth:** cookie de sessão protegido por `flutter_secure_storage`, restauração remota e logout.
- **Features:** login, cadastro, solicitação de recuperação, catálogo público, busca/filtro, detalhe básico, mapa nativo com marcadores, caderneta do servidor, painel inicial, rotas, coleção de cartas e cards de eventos.
- **Storage:** somente sessão. Sem SQLite/Drift ou progresso offline.

## Próximas camadas

- Pódio/XP/medalhas, perfil e preferências, ficha completa do ponto/galeria, certificados e compartilhamento nativo. O carimbo NFC/QR exige App Links e GPS validado pelo servidor.
- Leitor NFC/QR e Android App Links após verificar o contrato de links.
- Redefinição por token/deep link após confirmar o formato do e-mail.
- Prova real do ciclo de sessão em aparelho Android.

## API e segurança

- Base URL: `https://mais1km.novaagencian8n.online`.
- Rotas com prefixo `/api`.
- O backend não retorna token Bearer no JSON de login/cadastro.
- Não registrar senha, cookie, chave NFC, token de redefinição ou coordenadas.
- Operações de escrita afetam dados compartilhados com o site; usar apenas contas/pontos autorizados.
- Catálogo: filtrar status publicado e oculto false; não presumir que toda resposta de /api/catalogo esteja pronta para exibição.
- Nenhum carimbo offline; somente o servidor confirma uma visita.

## Build e CI

O workflow `.github/workflows/mobile.yml` executa `flutter pub get`, `flutter analyze --fatal-infos`, `flutter test` e build APK debug. A execução da CI deve ser acompanhada após o PR.
