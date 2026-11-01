# Baseline da migração Android — KMkm

**Data da verificação:** 2026-11-01 (UTC−03)
**Branch de trabalho:** `feature/flutter-android-migration`
**Commit-base:** `1004923223b0c380b99491a5e2778272ee3133a8`
**Status da `main`:** preservada; sem mudanças feitas nela.

## Git e cópia auditada

- Raiz: `/home/ubuntu/KMkm`.
- `origin`: `https://github.com/CostaGit33/KMkm.git`.
- `git fetch --all --prune` não encontrou commit mais novo que o baseline observado.
- O clone é **shallow** (`git rev-parse --is-shallow-repository` → `true`); o histórico local disponível é limitado. O objeto `1004923` existe e corresponde ao HEAD auditado.
- A árvore estava limpa antes da criação desta branch. A branch acima foi criada a partir de `main` em `1004923`; não havia branch local com esse nome.
- `docs/mobile/` não existia antes desta auditoria. A pasta foi criada vazia e receberá apenas documentação da Fase 0.
- Nenhuma conexão com produção, banco real ou serviço externo do Mais1km foi feita.
- O clone já continha `client/node_modules` e `server/node_modules` de uma verificação anterior desta sessão; são dependências ignoradas pelo Git, não alterações versionadas.

## Estrutura e tecnologias observadas

- `client/`: PWA em JavaScript/React/Vite, com telas, mapa, catálogo, perfil, consentimento de GA4 opcional e leitura de URL de tag.
- `server/`: Node.js/Express, API REST, MySQL (`mysql2`), migrações, autenticação, regras de carimbo, fotos, gamificação e integração de eventos com n8n.
- `shared/`: regras compartilhadas de gamificação.
- `docs/api/openapi.yaml` e coleção Postman: contratos existentes; há divergências pontuais anotadas em `02-mapa-api.md`.
- `.github/workflows/ci.yml`: CI usa Node.js 20, instala dependências separadas de client/server, faz build do client e executa os testes do server.
- `mobile/`, `pubspec.yaml`, projeto Flutter ou código Android nativo não existiam no baseline.

## Ferramentas disponíveis

| Ferramenta | Resultado no ambiente da auditoria |
|---|---|
| Node.js | `v22.23.4` |
| npm | `10.9.9` |
| Java | OpenJDK `21.0.12.1` |
| Flutter | Não instalado; `flutter: command not found` |
| Dart | Não instalado; `dart: command not found` |
| Android SDK / `ANDROID_HOME` / `ANDROID_SDK_ROOT` | Não configurado |
| `adb` | Não localizado no `PATH` |
| `sdkmanager` | Não localizado no `PATH` |
| Gradle global | Não localizado no `PATH` |

**Impacto:** não é possível executar `flutter create`, `flutter analyze`, `flutter test`, build APK/AAB ou provar persistência de sessão no runtime Flutter neste ambiente sem instalar/preparar a toolchain. Nenhuma instalação global foi feita. A prova de conceito de autenticação móvel fica pendente.

## Baseline de qualidade executada

| Comando | Resultado real |
|---|---|
| `npm --prefix server test` | PASSOU: 52 testes, 0 falhas, 0 ignorados. |
| `npm run build` | PASSOU: Vite 6.4.4 transformou 75 módulos e gerou `client/dist`. |
| Build Flutter / Android | NÃO EXECUTADO: Flutter/Dart e Android SDK ausentes. |
| E2E conta → carimbo → outro dispositivo | NÃO EXECUTADO: requer ambiente de aplicação/banco de teste e aparelhos ou emulador; não foi direcionado a produção. |

A execução foi local, usando as dependências instaladas no clone. Não representa homologação em staging ou validação de produção. O Node local é 22, enquanto o CI declara Node 20; essa diferença deve ser mantida em mente ao interpretar a baseline.

## Decisões de segurança observadas

- A API de conta emite cookie `mais1km_session` `HttpOnly`, com validade configurada em 30 dias; o banco armazena hash do token de sessão.
- O middleware da API também aceita `Authorization: Bearer`, mas cadastro/login de conta retornam os dados do usuário e definem cookie, sem devolver token Bearer no JSON.
- O endpoint legado `/api/entrar` cria usuário por apelido e devolve token; não é o fluxo recomendado de conta para o novo app.
- A PWA não persiste coordenadas enviadas para validação do carimbo. O Android deve continuar enviando GPS somente quando necessário para aquela operação.
- Nenhuma migração de banco, alteração de regra, alteração de segredo ou deploy foi executado nesta fase.
