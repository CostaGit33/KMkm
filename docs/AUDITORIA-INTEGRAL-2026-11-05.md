# Auditoria integral do KMkm — 05/11/2026

## Objetivo e método

Registro da primeira inspeção técnica do repositório `CostaGit33/KMkm`, baseada no estado de `main` em 05/11/2026. A auditoria cobre PWA, API, banco, Flutter, segurança, integrações, CI e documentação. Este documento é um baseline verificável, não uma declaração de que todo o escopo do produto foi auditado ou concluído.

## Baseline verificado

- Branch de referência: `main`.
- Commit de referência: `d31d8b8dfc330c7c3e265da28cc58002ec074376`.
- Repositório público; permissão de escrita disponível.
- Árvore GitHub consultada: 322 entradas, sem truncamento.
- Camadas identificadas:
  - `client/`: Vite, JavaScript/CSS, PWA e componentes React pontuais.
  - `server/`: Node.js ES modules, Express 4, MySQL (`mysql2`), migrações, mídia e testes.
  - `shared/`: regras compartilhadas de gamificação.
  - `mobile/`: aplicativo Flutter Android, NFC, App Links, GPS, mapa, autenticação, coleção e pódio.
  - `docs/`: arquitetura, API, segurança, operação e piloto.
- Infraestrutura documentada: Docker, GitHub Actions, MySQL, Cloudflare R2 opcional, Resend, Google Maps, Sentry e Better Stack.

## Evidências de CI

No GitHub Actions:
- PWA - Build: sucesso no commit `d31d8b8`.
- API - Testes: sucesso no commit `d31d8b8`.
- Mobile - Flutter CI: sucesso no commit `09471f0`, que incorporou a PR #44.
- Na branch da PR #45, API e Flutter também tiveram execuções concluídas com sucesso.

Esses resultados comprovam os jobs executados nos respectivos commits; não comprovam testes em produção, restauração de backup ou validação física de NFC/GPS.

## Classificação inicial dos achados

### Funcionalidades presentes — validar em profundidade
- Cadastro, login, sessão, logout, edição e exclusão de conta.
- Recuperação de senha por token.
- Catálogo público, rotas, mapa e pontos.
- Carimbo com chave de TAG e geofence.
- Caderneta, cartas, eventos, XP e pódio.
- Administração, mídia e trilha de auditoria.
- Flutter com leitura NFC, App Links, GPS, mapa, perfil e coleção.

### Parcialmente funcional ou dependente de configuração externa
- App Links dependem de `assetlinks.json` e do fingerprint correto do certificado.
- Release Android depende de keystore e secrets externos.
- Google Maps depende de chave; há alternativa OpenStreetMap.
- Recuperação de senha depende de configuração Resend.
- Armazenamento de mídia depende de R2 ou volume persistente.
- Observabilidade depende de DSNs/serviços externos.

### Lacunas documentadas no próprio projeto
- Teste E2E do fluxo completo: criar conta → carimbar → abrir em outro aparelho.
- Rate limiting persistente/compartilhado para mais de uma instância; hoje os buckets ficam em memória.
- Fila offline para carimbos e reenvio idempotente.
- Validação de presença com NTAG 424 DNA, caso seja exigida prova criptográfica.
- Restauração de backup MySQL em ambiente de teste.
- Conferência de CSP no celular e validação das coordenadas em campo.
- Limpeza de contas anônimas antigas.
- Divisão de `client/src/future.css` por tela.

### Inconsistências e riscos de documentação/processo
- `docs/PLAY-STORE.md` em `main` ainda descreve TWA/Bubblewrap, embora o repositório já tenha Flutter. A PR #45 contém a atualização para o fluxo Flutter e deve ser avaliada antes de duplicar esse trabalho.
- A PR #42 propõe Capacitor e PWA como implementação Android; isso conflita com a implementação Flutter já presente no `main`. Não incorporar essa proposta sem decisão arquitetural explícita.
- A PR #45 está em draft. Embora os jobs consultados estejam verdes, secrets, keystore e fingerprint de produção ainda exigem configuração externa.
- O README principal descreve a PWA e o servidor, mas não apresenta o aplicativo Flutter com o mesmo nível de detalhe.

## Plano de execução priorizado

### P0 — segurança e integridade
1. Revisar autorização por recurso e fronteiras entre participante/admin em todos os endpoints.
2. Auditar sessões, CSRF, cookies, rate limiting, recuperação de senha e revogação.
3. Auditar publicação/visibilidade de pontos, rotas, cartas, fotos e dados privados.
4. Revisar transações, concorrência, idempotência e constraints das operações de carimbo.
5. Validar configuração de produção sem expor segredos nem alterar dados reais.

### P1 — fluxos essenciais e paridade
1. Automatizar o fluxo conta → login → catálogo → TAG → geofence → carimbo → caderneta/cartas/XP.
2. Cobrir links NFC com app fechado, app aberto, sessão expirada e usuário não autenticado.
3. Comparar contratos API/PWA/Flutter e eliminar divergências de payload.
4. Testar estados vazios, erros, timeout, rede indisponível e recuperação de sessão.
5. Verificar o comportamento real do perfil, mapa, pódio, eventos e certificados.

### P2 — confiabilidade e operação
1. Planejar rate limiting compartilhado antes de escalar horizontalmente.
2. Definir estratégia de backup e executar restauração em homologação.
3. Validar upload, processamento, EXIF, cache e permissões de mídia.
4. Medir consultas, payloads, carregamento inicial e uso de memória.
5. Completar observabilidade e alertas com configuração externa documentada.

### P3 — experiência e manutenção
1. Auditar cada tela mobile e web em viewport pequeno.
2. Verificar acessibilidade, foco, labels, contraste e áreas de toque.
3. Reduzir CSS monolítico e duplicações com mudanças incrementais.
4. Atualizar documentação e changelog após cada entrega validada.

## Regras de execução

- Não alterar a página de classificação/ranking sem necessidade funcional ou de segurança demonstrada.
- Não inventar dados, métricas, conteúdo turístico ou resultados de testes.
- Não remover testes para obter suíte verde.
- Não executar migrations destrutivas nem alterar dados/configurações de produção durante a auditoria.
- Cada correção deve incluir teste correspondente e evidência de CI/build.
- Manter PWA e Flutter com contratos de API compatíveis, sem duplicar regras de negócio no cliente.
- Marcar como concluído somente o que tiver evidência reproduzível.

## Limitações desta etapa

Esta inspeção inicial foi feita pela árvore e arquivos do GitHub e pelos resultados de Actions. Não representa execução local de Node/Flutter, teste físico em Android/NFC/GPS, acesso ao MySQL de produção, verificação de secrets do GitHub ou inspeção de dados privados do ambiente operacional. Esses itens precisam de validação própria.
