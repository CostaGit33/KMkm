# ADR-0002 — Autenticação do cliente Flutter

**Status:** implementação inicial por cookie concluída; validação de integração real pendente.
**Data:** 2026-11-03

## Contexto

A API emite cookie HttpOnly `mais1km_session`, com validade de 30 dias, e guarda hash da sessão. Cadastro/login não retornam token Bearer no JSON. O app usa a mesma API e o mesmo banco do site.

## Decisão implementada

- O Flutter usa `HttpClient` nativo para chamadas HTTPS.
- O cookie recebido no cadastro/login é salvo em `flutter_secure_storage`.
- Chamadas autenticadas enviam o cookie no cabeçalho HTTP `Cookie`.
- Na abertura, `GET /api/conta/sessao` valida a sessão com o servidor.
- Logout chama `POST /api/conta/sair` e limpa o armazenamento local mesmo se a rede falhar.
- Nenhum endpoint ou resposta do backend foi alterado.

## Limites e validação pendente

Validar em aparelho Android contra a API real com conta de teste autorizada: persistência após reinício, expiração, sessão revogada e logout. Não executar cadastro ou outros POSTs contra a base real sem autorização explícita.
