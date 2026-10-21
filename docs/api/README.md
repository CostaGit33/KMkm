# API do +1 KM: contrato e testes

| Arquivo | Para quê |
|---|---|
| `openapi.yaml` | Contrato OpenAPI 3.0 de todas as rotas (conta, carimbo, coleção, gamificação, admin, páginas públicas). |
| `mais1km.postman_collection.json` | Coleção Postman/newman com 34 requisições e 42 asserções. |
| `local.postman_environment.json` | Ambiente `baseUrl = http://localhost:3000`. |
| `homologacao-ou-producao.postman_environment.json` | Ambiente com `baseUrl` para trocar pelo domínio publicado. |

O contrato foi escrito a partir de `server/index.js`, `server/admin.js` e `server/gamificacao.js`. Mudou uma rota, um código de erro ou um campo? Atualize o `openapi.yaml` e a coleção no mesmo commit.

## Rodar a coleção

```bash
npm i -g newman                      # uma vez

# local (servidor em http://localhost:3000, banco de teste)
newman run docs/api/mais1km.postman_collection.json -e docs/api/local.postman_environment.json

# produção: SÓ a pasta somente leitura
newman run docs/api/mais1km.postman_collection.json \
  --env-var baseUrl=https://SEU-DOMINIO \
  --folder "1 · Saúde e páginas (somente leitura)"
```

No app do Postman: *Import* → escolha os três arquivos `.json`.

## O que cada pasta faz

1. **Saúde e páginas (somente leitura).** `/api/saude` (inclui `banco` e `versao`), `/api/config-mapa`, `/api/catalogo`, tile inválido, páginas de privacidade, exclusão de conta e "como funciona", e as checagens de acesso negado sem sessão. Não grava nada: segura em produção.
2. **Conta e sessão.** Cria uma conta `postman-…@teste.invalid`, testa e-mail repetido, senha curta, e-mail inválido, troca de nome, senha atual errada, sair, entrar e sessão.
3. **Carimbo e coleção.** Carimba o primeiro ponto publicado do catálogo (grava um carimbo real), repete o toque, tag inexistente, caderneta, gamificação e pódio.
4. **Permissões e limpeza.** Conta comum não acessa `/api/admin/*` (403) e a conta de teste é apagada no fim.

Pastas 2 a 4 criam e apagam dados: use em local ou homologação.

## Cuidados

- **Limite de criação de conta:** 8 por 10 minutos por IP (e 12 logins). Uma execução usa 4 criações, então duas seguidas cabem e a terceira recebe `429 muitas_tentativas`. O contador fica na memória do processo; reiniciar o servidor zera.
- Se uma execução parar no meio, a conta `@teste.invalid` pode sobrar. `node server/scripts/teste-podio.js status` mostra o que existe, e `limpar` remove só contas `@teste.invalid` e carimbos de teste.
- Sem ponto publicado no catálogo, a pasta 3 pula o carimbo em vez de falhar.
- A requisição "Página: privacidade" falha de propósito enquanto `CONTATO_EMAIL` não estiver definida no servidor: a Google Play exige o contato.

## Validar o contrato

```bash
npx @redocly/cli lint docs/api/openapi.yaml
```

Os avisos `operation-4xx-response` sobre rotas de leitura simples são esperados.

## Cópia no Postman

Existe um workspace **+1 KM** na conta do Postman com a especificação, a coleção e os dois ambientes. É um espelho: a fonte da verdade é esta pasta. Para atualizar a nuvem, importe de novo os arquivos.
