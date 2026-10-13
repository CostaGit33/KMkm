# Verificação da V3 (caderneta_3) antes da V7

Conferido com servidor e banco reais (MariaDB 10.11, não MySQL 8.4), banco novo e banco vindo da V6.1:

- Conta, login, sessão, logout, e-mail duplicado, senha curta, 401, 403 de origem cruzada, 409 em ponto pendente (Eunápolis): conforme o documento de auditoria.
- Cookie `HttpOnly; SameSite=Lax` em HTTP e `Secure; SameSite=None` com `X-Forwarded-Proto: https`; senha/hash nunca na resposta.
- Migração 001 e índices aplicados em banco V6.1 com carimbo legado; token legado continua autenticando.
- 12 toques simultâneos do mesmo usuário no mesmo ponto geraram 1 carimbo.
- **Falha encontrada e corrigida:** a configuração de UTC da conexão (V6.1) tinha se perdido. Com o servidor em Tóquio a sessão durava 729 h em vez de 720 h (em Brasília, 717 h). Restaurado em `server/db/database.js`; medido 720 h.
- Pendências que continuam: `/api/entrar` ainda cria usuário anônimo com token em texto puro (usado pela página pública da tag); `hashPassword` usa `scryptSync` (bloqueia o servidor por alguns milissegundos por login); limite de requisições em memória e por IP.
- Não testado: HTTPS real, MySQL 8.4, celular físico.
